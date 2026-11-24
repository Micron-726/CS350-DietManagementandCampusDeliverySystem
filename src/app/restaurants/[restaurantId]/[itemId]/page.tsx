import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BagLink } from "@/components/bag-link";
import { db } from "@/db";
import { requireAccount } from "@/lib/auth";
import { isUuid } from "@/lib/menu";
import { dateInKorea } from "@/lib/korea-date";
import { loadMenuItem, supportsDemoOrdering } from "@/lib/menu-data";
import { MenuOptions } from "./menu-options";

type Props = Pick<PageProps<"/restaurants/[restaurantId]/[itemId]">, "params">;

export default function Page({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Suspense fallback={<p>불러오는 중…</p>}><MenuDetails params={params} /></Suspense>
    </main>
  );
}

async function MenuDetails({ params }: Props) {
  await connection();
  const account = await requireAccount("customer");
  const { restaurantId, itemId } = await params;
  if (!isUuid(restaurantId) || !isUuid(itemId)) notFound();
  const [restaurant, item] = await Promise.all([
    db.query.restaurants.findFirst({ where: (store, { eq }) => eq(store.id, restaurantId), with: { provider: true } }),
    loadMenuItem(restaurantId, itemId),
  ]);
  if (!restaurant?.isActive || !restaurant.provider.isActive || !item?.isAvailable || (item.serviceDate && item.serviceDate !== dateInKorea())) notFound();
  const bagCustomerId = restaurant.acceptingOrders && item.basePriceKrw !== null && supportsDemoOrdering(restaurant.provider)
    ? account.id : null;
  return (
    <>
      <nav aria-label="메뉴" className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href={`/restaurants/${restaurantId}`} className="underline underline-offset-4">{restaurant.name} 메뉴</Link>
        <BagLink customerId={account.id} />
      </nav>
      <h1 className="mb-2 mt-5 text-3xl font-bold">{item.name}</h1>
      {(item.category || item.serviceDate) && <p className="text-sm text-neutral-500">{[item.category, item.serviceDate].filter(Boolean).join(" · ")}</p>}
      {item.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{item.description}</p>}
      {item.sourceUrl && <a className="mt-3 inline-block text-sm underline underline-offset-4" href={item.sourceUrl}>KAIST 공식 식단</a>}
      <div className="mt-6"><MenuOptions key={`${item.id}:${item.updatedAt.getTime()}`} item={item} bagCustomerId={bagCustomerId} /></div>
    </>
  );
}
