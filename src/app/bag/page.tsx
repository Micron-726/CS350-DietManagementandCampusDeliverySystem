import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeading, PageLoading, PageMain } from "@/components/page-ui";
import { requireAccount } from "@/lib/auth";
import { BagCheckout } from "./bag-checkout";

export default function Page() {
  return (
    <PageMain>
      <PageHeading title="장바구니" description="담은 메뉴와 수량을 확인하고 함께 주문하세요." />
      <Suspense fallback={<PageLoading />}><CustomerBag /></Suspense>
    </PageMain>
  );
}

async function CustomerBag() {
  await connection();
  const account = await requireAccount("customer");
  return <BagCheckout customerId={account.id} />;
}
