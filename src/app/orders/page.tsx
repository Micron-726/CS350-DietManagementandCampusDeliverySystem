import { eq } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BagLink } from "@/components/bag-link";
import { OrderCard } from "@/components/order-card";
import { orders } from "@/db/schema";
import { requireAccount } from "@/lib/auth";
import { loadOrders } from "@/lib/order-data";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Suspense fallback={<p>불러오는 중…</p>}><CustomerOrders /></Suspense>
    </main>
  );
}

async function CustomerOrders() {
  await connection();
  const account = await requireAccount("customer");
  const history = await loadOrders(eq(orders.userId, account.id));
  return (
    <>
      <nav aria-label="주문" className="flex gap-5 text-sm">
        <Link href="/restaurants" className="underline underline-offset-4">식당 목록</Link>
        <BagLink customerId={account.id} />
      </nav>
      <h1 className="my-5 text-3xl font-bold">내 주문</h1>
      {history.length === 0 ? <p>주문 내역이 없습니다.</p> : (
        <div className="space-y-4">{history.map((order) => <OrderCard key={order.id} order={order} />)}</div>
      )}
    </>
  );
}
