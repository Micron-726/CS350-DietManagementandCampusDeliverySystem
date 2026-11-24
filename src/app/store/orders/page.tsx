import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { Suspense } from "react";
import { OrderCard } from "@/components/order-card";
import { orders } from "@/db/schema";
import { requireAccount } from "@/lib/auth";
import { loadOrders } from "@/lib/order-data";
import { demoPaymentMethod, orderActions } from "@/lib/order-status";
import { OrderActions } from "./order-actions";

export default function Page() {
  return <Suspense fallback={<p>불러오는 중…</p>}><StoreOrders /></Suspense>;
}

async function StoreOrders() {
  await connection();
  const account = await requireAccount("restaurant");
  if (!account.restaurantId) return <p>계정에 연결된 식당이 없습니다.</p>;
  const history = await loadOrders(eq(orders.restaurantId, account.restaurantId));
  const active = history.filter(({ status }) => status === "submitted" || status === "confirmed");
  const past = history.filter(({ status }) => status !== "submitted" && status !== "confirmed");

  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">주문 관리</h1>
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">진행 중 {active.length}건</h2>
          {active.length === 0 && <p className="text-sm text-neutral-500">진행 중인 주문이 없습니다.</p>}
          {active.map((order) => {
            const actions = order.payments[0]?.method === demoPaymentMethod
              ? orderActions(order.status, order.delivery?.status ?? null, order.fulfillmentType) : [];
            return <OrderCard key={order.id} order={order}>{actions.length > 0 && <OrderActions orderId={order.id} actions={actions} />}</OrderCard>;
          })}
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">지난 주문</h2>
          {past.length === 0 && <p className="text-sm text-neutral-500">지난 주문이 없습니다.</p>}
          {past.map((order) => <OrderCard key={order.id} order={order} />)}
        </section>
      </div>
    </>
  );
}
