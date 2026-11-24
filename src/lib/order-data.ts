import "server-only";
import type { SQL } from "drizzle-orm";
import { db } from "@/db";

export function loadOrders(where: SQL) {
  return db.query.orders.findMany({
    where,
    orderBy: (order, { desc }) => [desc(order.createdAt), desc(order.id)],
    with: {
      restaurant: { columns: { name: true } },
      items: true,
      delivery: true,
      payments: { orderBy: (payment, { desc }) => [desc(payment.createdAt), desc(payment.id)], limit: 1 },
      events: { orderBy: (event, { asc }) => [asc(event.occurredAt), asc(event.id)] },
    },
  });
}

export type OrderDetails = Awaited<ReturnType<typeof loadOrders>>[number];
