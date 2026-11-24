import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/db";
import { requireAccount, selectOwnedRestaurant } from "@/lib/auth";
import { showNutrition, showPrice } from "@/lib/menu";
import { MENU_WITH_PORTIONS, menuPeriodOrder, menuServedOn } from "@/lib/menu-data";
import { RestaurantLinks, storePath } from "../restaurant-links";

type Props = Pick<PageProps<"/store/menu">, "searchParams">;

export default function Page({ searchParams }: Props) {
  return <Suspense fallback={<p>불러오는 중…</p>}><MenuList searchParams={searchParams} /></Suspense>;
}

async function MenuList({ searchParams }: Props) {
  await connection();
  const account = await requireAccount("restaurant");
  if (!account.restaurantId) return <p>계정에 연결된 식당이 없습니다.</p>;
  const restaurant = selectOwnedRestaurant(account, (await searchParams).restaurant);
  if (!restaurant) notFound();
  const restaurantId = restaurant.id;
  const menu = await db.query.menuItems.findMany({
    where: (item, { and, eq }) => and(eq(item.restaurantId, restaurantId), menuServedOn()),
    orderBy: (item, { asc }) => [menuPeriodOrder, asc(item.category), asc(item.name)],
    with: MENU_WITH_PORTIONS,
  });

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">메뉴 관리</h1><p className="mt-1 text-sm text-neutral-500">{restaurant.name} · 메뉴 {menu.length}개</p></div>
        <Link href={storePath("/store/menu/new", restaurantId)} className="rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white">메뉴 추가</Link>
      </div>
      <RestaurantLinks account={account} selectedId={restaurantId} path="/store/menu" />
      {menu.length === 0 ? <p>등록된 메뉴가 없습니다.</p> : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-100 dark:bg-neutral-900"><tr>{["메뉴", "재료 및 양", "가격", "열량", "단백질", "상태"].map((label) =>
              <th key={label} scope="col" className="whitespace-nowrap px-4 py-3">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {menu.map((item) => (
                <tr key={item.id}>
                  <th scope="row" className="min-w-44 px-4 py-3 font-medium">
                    <Link href={storePath(`/store/menu/${item.id}`, restaurantId)} className="underline underline-offset-4">{item.name}</Link>
                    {(item.category || item.serviceDate) && <span className="mt-1 block text-xs text-neutral-500">{[item.category, item.serviceDate].filter(Boolean).join(" · ")}</span>}
                  </th>
                  <td className="min-w-32 px-4 py-3">
                    {item.components.length > 0 ? (
                      <details>
                        <summary className="cursor-pointer">재료 {item.components.length}개</summary>
                        <ul className="mt-1 space-y-1 text-xs text-neutral-500">
                          {item.components.map((component) => (
                            <li key={component.id}>{component.name}{component.levels.length > 0 && ` · ${component.levels.map((level) => level.label).join(", ")}`}</li>
                          ))}
                        </ul>
                      </details>
                    ) : "정보 없음"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{showPrice(item.basePriceKrw)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{showNutrition(item.baseKcal, "kcal", item.kcalSource)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{showNutrition(item.baseProteinG, "g", item.proteinSource)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{item.isAvailable ? "판매 중" : "판매 중지"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
