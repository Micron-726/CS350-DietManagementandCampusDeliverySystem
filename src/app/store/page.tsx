import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/db";
import { requireAccount } from "@/lib/auth";
import { logout } from "../login/actions";

export default function StorePage() {
  return <Suspense fallback={<p>불러오는 중…</p>}><StoreHome /></Suspense>;
}

async function StoreHome() {
  await connection();
  const account = await requireAccount("restaurant");
  const restaurantId = account.restaurantId;
  const restaurant = restaurantId ? await db.query.restaurants.findFirst({
    where: (store, { eq }) => eq(store.id, restaurantId),
  }) : undefined;

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold">{restaurant?.name ?? "가게 관리"}</h1>
      <p className="mb-6 text-sm text-neutral-500">{restaurant?.address ?? restaurant?.campusArea ?? account.email}</p>
      {restaurant ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <Link href="/store/menu" className="rounded-xl border border-neutral-200 p-5 hover:border-emerald-600 dark:border-neutral-700">
            <h2 className="font-semibold">메뉴 관리</h2><p className="mt-2 text-sm text-neutral-500">가격, 영양 정보, 재료와 양 옵션을 편집합니다.</p>
          </Link>
          <Link href="/store/orders" className="rounded-xl border border-neutral-200 p-5 hover:border-emerald-600 dark:border-neutral-700">
            <h2 className="font-semibold">주문 관리</h2><p className="mt-2 text-sm text-neutral-500">새 주문을 확인하고 배달 상태를 업데이트합니다.</p>
          </Link>
        </div>
      ) : <p className="mb-6">아직 이 계정에 연결된 식당이 없습니다. 관리자에게 문의해 주세요.</p>}
      <form action={logout}><button className="rounded-md border px-3 py-2 text-sm">로그아웃</button></form>
    </>
  );
}
