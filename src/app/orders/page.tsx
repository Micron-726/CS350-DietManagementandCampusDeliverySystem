import { eq } from "drizzle-orm";
import { ClipboardList } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink } from "@/components/button-link";
import { OrderCard } from "@/components/order-card";
import { ContentEmpty, PageHeading, PageLoading, PageMain } from "@/components/page-ui";
import { orders } from "@/db/schema";
import { requireAccount } from "@/lib/auth";
import { loadOrders } from "@/lib/order-data";

export default function Page() {
  return (
    <PageMain className="max-w-4xl">
      <PageHeading title="내 주문" description="주문, 결제, 배달 상태를 확인하세요." />
      <Suspense fallback={<PageLoading />}><CustomerOrders /></Suspense>
    </PageMain>
  );
}

async function CustomerOrders() {
  await connection();
  const account = await requireAccount("customer");
  const history = await loadOrders(eq(orders.userId, account.id));

  return history.length ? (
    <section aria-labelledby="order-history" className="flex flex-col gap-4">
      <h2 id="order-history" className="sr-only">주문 내역</h2>
      {history.map((order) => <OrderCard key={order.id} order={order} />)}
    </section>
  ) : (
    <ContentEmpty icon={ClipboardList} title="주문 내역이 없습니다.">
      <ButtonLink href="/restaurants">교내 식당 보기</ButtonLink>
    </ContentEmpty>
  );
}
