import { eq } from "drizzle-orm";
import { ClipboardList, Store } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { OrderCard } from "@/components/order-card";
import { ContentEmpty, PageHeading, PageLoading } from "@/components/page-ui";
import { Badge } from "@/components/ui/badge";
import { orders } from "@/db/schema";
import { requireAccount, selectOwnedRestaurant } from "@/lib/auth";
import { loadOrders } from "@/lib/order-data";
import { demoPaymentMethod, orderActions } from "@/lib/order-status";
import { OrderActions } from "./order-actions";
import { RestaurantLinks } from "../restaurant-links";

type Props = Pick<PageProps<"/store/orders">, "searchParams">;

export default function Page({ searchParams }: Props) {
  return <Suspense fallback={<PageLoading />}><StoreOrders searchParams={searchParams} /></Suspense>;
}

async function StoreOrders({ searchParams }: Props) {
  await connection();
  const account = await requireAccount("restaurant");
  if (!account.restaurantId) return <ContentEmpty icon={Store} title="계정에 연결된 식당이 없습니다." />;
  const restaurant = selectOwnedRestaurant(account, (await searchParams).restaurant);
  if (!restaurant) notFound();
  const history = await loadOrders(eq(orders.restaurantId, restaurant.id));
  const active = history.filter(({ status }) => status === "submitted" || status === "confirmed");
  const past = history.filter(({ status }) => status !== "submitted" && status !== "confirmed");

  return (
    <>
      <PageHeading title="주문 관리" description={restaurant.name} />
      <RestaurantLinks account={account} selectedId={restaurant.id} path="/store/orders" />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section aria-labelledby="active-orders" className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-2"><h2 id="active-orders" className="text-xl font-semibold">진행 중</h2><Badge variant="secondary">{active.length}건</Badge></div>
          {active.length === 0 && <ContentEmpty icon={ClipboardList} title="진행 중인 주문이 없습니다." />}
          {active.map((order) => {
            const actions = order.payments[0]?.method === demoPaymentMethod
              ? orderActions(order.status, order.delivery?.status ?? null, order.fulfillmentType) : [];
            return <OrderCard key={order.id} order={order}>{actions.length > 0 && <OrderActions orderId={order.id} actions={actions} />}</OrderCard>;
          })}
        </section>
        <section aria-labelledby="past-orders" className="flex min-w-0 flex-col gap-4">
          <h2 id="past-orders" className="text-xl font-semibold">지난 주문</h2>
          {past.length === 0 && <ContentEmpty icon={ClipboardList} title="지난 주문이 없습니다." />}
          {past.map((order) => <OrderCard key={order.id} order={order} />)}
        </section>
      </div>
    </>
  );
}
