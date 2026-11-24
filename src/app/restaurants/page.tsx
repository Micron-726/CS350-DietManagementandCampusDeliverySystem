import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BagLink } from "@/components/bag-link";
import { db } from "@/db";
import { requireAccount } from "@/lib/auth";
import { supportsDemoOrdering } from "@/lib/menu-data";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Suspense fallback={<p>불러오는 중…</p>}><RestaurantList /></Suspense>
    </main>
  );
}

async function RestaurantList() {
  await connection();
  const account = await requireAccount("customer");
  const list = await db.query.restaurants.findMany({
    where: (restaurant, { eq }) => eq(restaurant.isActive, true),
    orderBy: (restaurant, { asc }) => [asc(restaurant.campusArea), asc(restaurant.name)],
    with: { provider: true },
  });
  const active = list.filter(({ provider }) => provider.isActive);
  return (
    <>
      <nav aria-label="식당" className="flex gap-5 text-sm"><Link href="/">홈</Link><Link href="/orders">내 주문</Link><BagLink customerId={account.id} /></nav>
      <h1 className="my-5 text-3xl font-bold">교내 식당</h1>
      {active.length === 0 ? <p>등록된 식당이 없습니다.</p> : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((restaurant) => (
            <li key={restaurant.id}>
              <Link href={`/restaurants/${restaurant.id}`} className="block h-full rounded-xl border border-neutral-200 p-5 hover:border-emerald-600 dark:border-neutral-700">
                <h2 className="font-semibold">{restaurant.name}</h2>
                <p className="mt-1 text-sm text-neutral-500">{restaurant.address ?? restaurant.campusArea ?? "위치 정보 없음"}</p>
                <p className="mt-3 text-sm">{restaurant.acceptingOrders && supportsDemoOrdering(restaurant.provider) ? "모의 주문 가능" : "메뉴 보기"}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
