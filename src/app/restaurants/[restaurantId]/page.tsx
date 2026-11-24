import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BagLink } from "@/components/bag-link";
import { db } from "@/db";
import { requireAccount } from "@/lib/auth";
import { isUuid, showNutrition, showPrice } from "@/lib/menu";
import { menuPeriodOrder, menuServedOn, supportsDemoOrdering } from "@/lib/menu-data";

export default function Page({ params }: PageProps<"/restaurants/[restaurantId]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Suspense fallback={<p className="mt-4">불러오는 중…</p>}><RestaurantMenu params={params} /></Suspense>
    </main>
  );
}

async function RestaurantMenu({ params }: Pick<PageProps<"/restaurants/[restaurantId]">, "params">) {
  await connection();
  const account = await requireAccount("customer");
  const { restaurantId } = await params;
  if (!isUuid(restaurantId)) notFound();
  const restaurant = await db.query.restaurants.findFirst({
    where: (store, { and, eq }) => and(eq(store.id, restaurantId), eq(store.isActive, true)),
    with: { provider: true, menuItems: {
      where: (item, { and, eq }) => and(eq(item.isAvailable, true), menuServedOn()),
      orderBy: (item, { asc }) => [menuPeriodOrder, asc(item.category), asc(item.name)],
    } },
  });
  if (!restaurant?.provider.isActive) notFound();
  const categories = new Map<string, typeof restaurant.menuItems>();
  for (const item of restaurant.menuItems) {
    const category = item.category ?? "메뉴";
    const items = categories.get(category) ?? [];
    items.push(item);
    categories.set(category, items);
  }
  return (
    <>
      <nav aria-label="식당" className="flex items-center justify-between gap-3 text-sm">
        <Link href="/restaurants" className="underline underline-offset-4">식당 목록</Link>
        <BagLink customerId={account.id} />
      </nav>
      <h1 className="mt-5 text-3xl font-bold">{restaurant.name}</h1>
      <p className="mb-6 mt-1 text-sm text-neutral-500">{restaurant.address ?? restaurant.campusArea}</p>
      {(!restaurant.acceptingOrders || !supportsDemoOrdering(restaurant.provider)) && (
        <p className="mb-6 rounded-md border border-neutral-300 p-3 text-sm dark:border-neutral-700">이 식당은 앱에서 주문할 수 없습니다.</p>
      )}
      {categories.size === 0 && <p>오늘 표시할 메뉴가 없습니다.</p>}
      <div className="space-y-8">
        {[...categories].map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-3 text-xl font-semibold">{category}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <li key={item.id}>
                  <Link href={`/restaurants/${restaurantId}/${item.id}`} className="block h-full rounded-lg border border-neutral-200 p-4 hover:border-emerald-600 dark:border-neutral-700">
                    <div className="flex justify-between gap-3"><h3 className="font-semibold">{item.name}</h3><span className="tabular-nums">{showPrice(item.basePriceKrw)}</span></div>
                    <p className="mt-2 text-sm text-neutral-500">열량 {showNutrition(item.baseKcal, "kcal", item.kcalSource)} / 단백질 {showNutrition(item.baseProteinG, "g", item.proteinSource)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
