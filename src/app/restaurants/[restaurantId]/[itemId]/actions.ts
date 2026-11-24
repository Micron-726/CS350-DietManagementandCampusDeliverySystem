"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { deliveries, menuItems, orderEvents, orderItems, orders, payments, providers, restaurants, type PortionSnapshot } from "@/db/schema";
import { requireAccount } from "@/lib/auth";
import { isUuid, menuTotals } from "@/lib/menu";
import { MENU_WITH_PORTIONS, supportsDemoOrdering } from "@/lib/menu-data";
import { demoPaymentMethod } from "@/lib/order-status";

export async function checkout(restaurantId: string, itemId: string, version: number, _: string | null, form: FormData) {
  const account = await requireAccount("customer");
  const requestId = form.get("requestId");
  const quantity = Number(form.get("quantity"));
  const address = form.get("address");
  const selectedIds = form.getAll("levelId");
  const payment = form.get("payment");
  if (!isUuid(requestId) || !isUuid(restaurantId) || !isUuid(itemId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20 ||
      typeof address !== "string" || address.trim().length < 1 || address.trim().length > 100 ||
      !selectedIds.every(isUuid) || new Set(selectedIds).size !== selectedIds.length || (payment !== "approve" && payment !== "decline")) {
    return "수량, 배달 위치, 양 옵션과 결제 선택을 확인해 주세요.";
  }

  const idempotencyKey = `${account.id}:${requestId.toLowerCase()}`;
  const orderScope = and(eq(orders.userId, account.id), eq(orders.idempotencyKey, idempotencyKey));
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: orders.id }).from(orders).where(orderScope);
    if (existing) return existing;

    const [store] = await tx.select({ restaurant: restaurants, provider: providers }).from(menuItems)
      .innerJoin(restaurants, eq(menuItems.restaurantId, restaurants.id)).innerJoin(providers, eq(restaurants.providerId, providers.id))
      .where(and(eq(menuItems.id, itemId), eq(restaurants.id, restaurantId), eq(menuItems.isAvailable, true)))
      .for("share", { of: [menuItems, restaurants, providers] });
    if (!store?.restaurant.isActive || !store.restaurant.acceptingOrders || !supportsDemoOrdering(store.provider)) {
      return { error: "현재 이 메뉴는 주문할 수 없습니다." };
    }
    const item = await tx.query.menuItems.findFirst({ where: eq(menuItems.id, itemId), with: MENU_WITH_PORTIONS });
    if (!item || item.updatedAt.getTime() !== version) return { error: "메뉴가 변경되었습니다. 페이지를 새로고침한 뒤 다시 주문해 주세요." };

    const selected = new Set(selectedIds);
    const components = item.components.filter((component) => component.levels.length > 0);
    const choices = components.flatMap((component) => component.levels.filter((level) => selected.has(level.id)));
    if (choices.length !== selected.size || new Set(choices.map((level) => level.componentId)).size !== components.length || choices.length !== components.length) {
      return { error: "재료마다 양 옵션을 하나씩 선택해 주세요." };
    }
    const total = menuTotals(item, choices);
    const totalPriceKrw = total.price * quantity;
    if (totalPriceKrw < 0 || totalPriceKrw > 2147483647 || (total.kcal.value ?? 0) < 0 || (total.protein.value ?? 0) < 0) {
      return { error: "선택한 옵션의 가격 또는 영양 정보를 확인할 수 없습니다." };
    }
    const portions: PortionSnapshot[] = choices.map((level) => {
      const component = components.find((entry) => entry.id === level.componentId)!;
      return {
        componentId: component.id, portionLevelId: level.id, componentType: component.type, componentName: component.name,
        level: level.level, label: level.label, priceDeltaKrw: level.priceDeltaKrw,
        kcalDelta: level.kcalDelta, proteinDeltaG: level.proteinDeltaG,
      };
    });

    const id = randomUUID();
    const declined = payment === "decline";
    const status = declined ? "failed" : "submitted";
    const paymentStatus = declined ? "failed" : "authorized";
    const [order] = await tx.insert(orders).values({
      id, userId: account.id, providerId: store.provider.id, restaurantId, idempotencyKey, status,
      totalPriceKrw, totalKcal: total.kcal.value === null ? null : total.kcal.value * quantity,
      totalProteinG: total.protein.value === null ? null : total.protein.value * quantity,
      submittedAt: declined ? null : new Date(), failureReason: declined ? "모의 결제가 거절되었습니다. 새 주문에서 다시 시도할 수 있습니다." : null,
    }).onConflictDoNothing({ target: orders.idempotencyKey }).returning({ id: orders.id });
    if (!order) {
      const [retry] = await tx.select({ id: orders.id }).from(orders).where(orderScope);
      if (!retry) throw new Error("Duplicate order was not found");
      return retry;
    }
    await tx.insert(orderItems).values({
      orderId: id, menuItemId: itemId, name: item.name, quantity, unitPriceKrw: total.price,
      kcal: total.kcal.value, kcalSource: total.kcal.source, proteinG: total.protein.value, proteinSource: total.protein.source, portions,
    });
    await tx.insert(payments).values({ orderId: id, amountKrw: totalPriceKrw, method: demoPaymentMethod, status: paymentStatus });
    if (!declined) await tx.insert(deliveries).values({ orderId: id, addressLabel: address.trim() });
    await tx.insert(orderEvents).values([
      { orderId: id, kind: "payment", status: paymentStatus, source: "system" },
      { orderId: id, kind: "order", status, source: "system" },
    ]);
    return order;
  });

  if ("error" in result) return result.error;
  revalidatePath("/orders");
  revalidatePath("/store/orders");
  redirect(`/orders#${result.id}`);
}
