"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { deliveries, orderEvents, orders, payments, restaurants } from "@/db/schema";
import { requireAccount } from "@/lib/auth";
import { isUuid } from "@/lib/menu";
import { demoPaymentMethod, orderActions, type Transition } from "@/lib/order-status";

export async function updateOrder(orderId: string, _: string | null, form: FormData) {
  const account = await requireAccount("restaurant");
  const transition = form.get("transition") as Transition;
  const restaurantId = account.restaurantId;
  if (!restaurantId || !isUuid(orderId)) return "주문 정보를 확인해 주세요.";

  const changed = await db.transaction(async (tx) => {
    const [order] = await tx.select({ status: orders.status, fulfillment: orders.fulfillmentType }).from(orders).innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(and(eq(orders.id, orderId), eq(orders.restaurantId, restaurantId), eq(restaurants.ownerId, account.id)))
      .for("update", { of: orders });
    if (!order) return false;
    const [delivery] = await tx.select().from(deliveries).where(eq(deliveries.orderId, orderId));
    const [payment] = await tx.select().from(payments).where(and(eq(payments.orderId, orderId), eq(payments.method, demoPaymentMethod)));
    if (!payment || !delivery || !orderActions(order.status, delivery.status, order.fulfillment).includes(transition)) return false;

    const now = new Date();
    const events: (typeof orderEvents.$inferInsert)[] = [];
    const deliveryStatus = { accept: "preparing", reject: "cancelled", dispatch: "in_transit", ready: "ready_for_pickup", complete: "delivered" } as const;
    if (transition === "accept") {
      if (payment.status !== "authorized") return false;
      await tx.update(orders).set({ status: "confirmed", confirmedAt: now, providerOrderId: `DEMO-${orderId}` }).where(eq(orders.id, orderId));
      await tx.update(payments).set({ status: "paid", paidAt: now }).where(eq(payments.id, payment.id));
      events.push({ orderId, kind: "order", status: "confirmed", source: "system" }, { orderId, kind: "payment", status: "paid", source: "system" });
    } else if (transition === "reject") {
      if (payment.status !== "authorized") return false;
      await tx.update(orders).set({ status: "failed", failureReason: "가게에서 주문을 거절했습니다." }).where(eq(orders.id, orderId));
      await tx.update(payments).set({ status: "cancelled" }).where(eq(payments.id, payment.id));
      events.push({ orderId, kind: "order", status: "failed", source: "system" }, { orderId, kind: "payment", status: "cancelled", source: "system" });
    } else if (transition === "complete") {
      await tx.update(orders).set({ status: "completed" }).where(eq(orders.id, orderId));
      events.push({ orderId, kind: "order", status: "completed", source: "system" });
    }
    await tx.update(deliveries).set({ status: deliveryStatus[transition], deliveredAt: transition === "complete" ? now : null })
      .where(eq(deliveries.orderId, orderId));
    events.push({ orderId, kind: "delivery", status: deliveryStatus[transition], source: "system" });
    await tx.insert(orderEvents).values(events);
    return true;
  });

  revalidatePath("/store/orders");
  revalidatePath("/orders");
  return changed ? null : "처리할 수 없는 주문입니다. 현재 주문 상태를 확인해 주세요.";
}
