"use server";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { deliveries, menuItems, orderEvents, orderItems, orders, payments, providers, restaurants } from "@/db/schema";
import { requireAccount } from "@/lib/auth";
import { decodeJson, parseBag, parseSelections } from "@/lib/bag";
import { evaluateBag, loadBagMenus, quoteFor } from "@/lib/bag-data";
import { demoPaymentMethod } from "@/lib/order-status";

type NewOrder = typeof orders.$inferInsert & { id: string };
type Receipt = { requestId: string; orderId: string; declined: boolean };
export type CheckoutResponse = { error: string; staleQuote?: string } | Receipt | null;

export async function quoteBag(raw: string) {
  await requireAccount("customer");
  const selections = parseSelections(decodeJson(raw));
  if (!selections) return null;
  const ids = [...new Set(selections.map((line) => line.itemId))];
  return quoteFor(evaluateBag(selections, await loadBagMenus(db.query, ids)));
}

export async function checkoutBag(_: CheckoutResponse, form: FormData): Promise<CheckoutResponse> {
  const account = await requireAccount("customer");
  const bag = parseBag(form.get("bag"));
  const revision = form.get("revision");
  const address = form.get("address");
  const payment = form.get("payment");
  if (!bag || typeof revision !== "string" || !/^[0-9a-f]{64}$/.test(revision) ||
      typeof address !== "string" || address.trim().length < 1 || address.trim().length > 100 ||
      (payment !== "approve" && payment !== "decline")) {
    return { error: "장바구니, 배달 위치와 결제 선택을 확인해 주세요." };
  }

  const checkoutKey = `bag:${account.id}:${bag.requestId}`;
  const result = await db.transaction(async (tx) => {
    // A checkout creates all store orders in one transaction. A retry reads that same batch.
    await tx.execute(sql`select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(${checkoutKey}, 0))`);
    const [existing] = await tx.select({ id: orders.id, submittedAt: orders.submittedAt }).from(orders)
      .where(and(eq(orders.userId, account.id), like(orders.idempotencyKey, `${checkoutKey}:%`)))
      .orderBy(asc(orders.id)).limit(1);
    if (existing) return { requestId: bag.requestId, orderId: existing.id, declined: existing.submittedAt === null };

    const ids = [...new Set(bag.lines.map((line) => line.itemId))];
    await tx.select({ id: menuItems.id }).from(menuItems)
      .innerJoin(restaurants, eq(menuItems.restaurantId, restaurants.id))
      .innerJoin(providers, eq(restaurants.providerId, providers.id))
      .where(inArray(menuItems.id, ids)).orderBy(asc(menuItems.id))
      .for("share", { of: [menuItems, restaurants, providers] });

    const evaluated = evaluateBag(bag.lines, await loadBagMenus(tx.query, ids));
    if (quoteFor(evaluated).revision !== revision) {
      return { error: "메뉴 정보가 변경되었습니다. 장바구니를 새로고침한 뒤 확인해 주세요.", staleQuote: revision };
    }

    const declined = payment === "decline";
    const status = declined ? "failed" : "submitted";
    const paymentStatus: "failed" | "authorized" = declined ? "failed" : "authorized";
    const submittedAt = declined ? null : new Date();
    const grouped = new Map<string, { order: NewOrder; items: (typeof orderItems.$inferInsert)[] }>();
    for (const [index, entry] of evaluated.entries()) {
      if (!entry.verified) return { error: "현재 주문할 수 없는 메뉴가 있습니다.", staleQuote: revision };
      const { item, totals, portions } = entry.verified;
      const { quantity } = bag.lines[index];
      let group = grouped.get(item.restaurantId);
      if (!group) {
        group = {
          order: {
            id: randomUUID(), userId: account.id, providerId: item.restaurant.providerId, restaurantId: item.restaurantId,
            idempotencyKey: `${checkoutKey}:${item.restaurantId}`, status, submittedAt,
            totalPriceKrw: 0, totalKcal: 0, totalProteinG: 0,
            failureReason: declined ? "모의 결제가 거절되었습니다. 장바구니에서 다시 시도할 수 있습니다." : null,
          },
          items: [],
        };
        grouped.set(item.restaurantId, group);
      }
      group.order.totalPriceKrw += totals.price * quantity;
      if (group.order.totalPriceKrw > 2147483647) return { error: "주문 금액이 너무 큽니다. 수량을 줄여 주세요." };
      group.order.totalKcal = group.order.totalKcal == null || totals.kcal.value === null ? null : group.order.totalKcal + totals.kcal.value * quantity;
      group.order.totalProteinG = group.order.totalProteinG == null || totals.protein.value === null ? null : group.order.totalProteinG + totals.protein.value * quantity;
      group.items.push({
        orderId: group.order.id, menuItemId: item.id, name: item.name, quantity, unitPriceKrw: totals.price,
        kcal: totals.kcal.value, kcalSource: totals.kcal.source, proteinG: totals.protein.value, proteinSource: totals.protein.source, portions,
      });
    }
    const groups = [...grouped.values()];
    await tx.insert(orders).values(groups.map(({ order }) => order));
    await tx.insert(orderItems).values(groups.flatMap(({ items }) => items));
    await tx.insert(payments).values(groups.map(({ order }) => ({
      orderId: order.id, amountKrw: order.totalPriceKrw, method: demoPaymentMethod, status: paymentStatus,
    })));
    if (!declined) {
      await tx.insert(deliveries).values(groups.map(({ order }) => ({ orderId: order.id, addressLabel: address.trim() })));
    }
    await tx.insert(orderEvents).values(groups.flatMap(({ order }) => [
      { orderId: order.id, kind: "payment", status: paymentStatus, source: "system" },
      { orderId: order.id, kind: "order", status, source: "system" },
    ]));
    return { requestId: bag.requestId, orderId: groups.map(({ order }) => order.id).sort()[0], declined };
  });

  if ("orderId" in result) {
    revalidatePath("/orders");
    revalidatePath("/store/orders");
  }
  return result;
}
