import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAccount } from "@/lib/auth";
import { BagCheckout } from "./bag-checkout";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <nav aria-label="장바구니" className="flex gap-5 text-sm underline underline-offset-4">
        <Link href="/restaurants">식당 목록</Link>
        <Link href="/orders">내 주문</Link>
      </nav>
      <h1 className="my-5 text-3xl font-bold">장바구니</h1>
      <Suspense fallback={<p>불러오는 중…</p>}><CustomerBag /></Suspense>
    </main>
  );
}

async function CustomerBag() {
  await connection();
  const account = await requireAccount("customer");
  return <BagCheckout customerId={account.id} />;
}
