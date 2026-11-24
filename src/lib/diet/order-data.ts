import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import type { DietClient } from "./data";
import { isLoggableStatus, type OrderLine, representativeItemId } from "./order-log";

/**
 * Orders are read-only for users (RLS: owner read), so they're read with Drizzle like the team's
 * order pages do — always filtered by the signed-in user's id. Food-log rows still go through
 * supabase-js (RLS).
 */

const lineColumns = {
  id: orderItems.id,
  name: orderItems.name,
  quantity: orderItems.quantity,
  kcal: orderItems.kcal,
  kcalSource: orderItems.kcalSource,
  proteinG: orderItems.proteinG,
  proteinSource: orderItems.proteinSource,
};

/** The user's own order with its items, or undefined. */
export function loadOrderForLog(userId: string, orderId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
    columns: { id: true, status: true, confirmedAt: true, createdAt: true },
    with: { restaurant: { columns: { name: true } }, items: { columns: { id: true, name: true, quantity: true, kcal: true, kcalSource: true, proteinG: true, proteinSource: true } } },
  });
}

/**
 * For each loggable (confirmed/completed) order: the date of its food-log entry, or null when it
 * isn't logged yet. Orders that can't be logged are absent from the map.
 */
export async function orderLogDates(
  supabase: DietClient,
  userId: string,
  list: readonly { id: string; status: string; items: readonly { id: string }[] }[],
): Promise<Map<string, string | null>> {
  const links = new Map<string, string>(); // representative item id → order id
  for (const order of list) {
    const link = isLoggableStatus(order.status) ? representativeItemId(order.items) : null;
    if (link) links.set(link, order.id);
  }
  const dates = new Map<string, string | null>([...links.values()].map((orderId) => [orderId, null]));
  if (!links.size) return dates;

  const { data, error } = await supabase.from("meal_logs")
    .select("order_item_id, log_date")
    .eq("user_id", userId)
    .in("order_item_id", [...links.keys()]);
  if (error) throw error;
  for (const row of data) {
    const orderId = row.order_item_id && links.get(row.order_item_id);
    if (orderId) dates.set(orderId, row.log_date);
  }
  return dates;
}

/**
 * Item lines of the orders behind food-log entries, keyed by the entry's `order_item_id`
 * (the representative item). Only the user's own orders are read.
 */
export async function orderLinesByLink(userId: string, linkIds: readonly string[]): Promise<Record<string, OrderLine[]>> {
  if (!linkIds.length) return {};
  const links = await db.select({ linkId: orderItems.id, orderId: orderItems.orderId })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(inArray(orderItems.id, [...linkIds]), eq(orders.userId, userId)));
  if (!links.length) return {};

  const lines = await db.select({ ...lineColumns, orderId: orderItems.orderId })
    .from(orderItems)
    .where(inArray(orderItems.orderId, links.map(({ orderId }) => orderId)))
    .orderBy(asc(orderItems.createdAt), asc(orderItems.id));

  const result: Record<string, OrderLine[]> = {};
  for (const { linkId, orderId } of links) {
    result[linkId] = lines.filter((line) => line.orderId === orderId).map((line) => ({
      id: line.id, name: line.name, quantity: line.quantity,
      kcal: line.kcal, kcalSource: line.kcalSource, proteinG: line.proteinG, proteinSource: line.proteinSource,
    }));
  }
  return result;
}
