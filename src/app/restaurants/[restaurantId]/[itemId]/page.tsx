import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/db";
import { requireAccount } from "@/lib/auth";
import { isUuid } from "@/lib/menu";
import { loadMenuItem, supportsDemoOrdering } from "@/lib/menu-data";
import { checkout } from "./actions";
import { CheckoutForm } from "./checkout-form";

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
  await requireAccount("customer");
  const { restaurantId, itemId } = await params;
  if (!isUuid(restaurantId) || !isUuid(itemId)) notFound();
  const [restaurant, item] = await Promise.all([
    db.query.restaurants.findFirst({ where: (store, { eq }) => eq(store.id, restaurantId), with: { provider: true } }),
    loadMenuItem(restaurantId, itemId),
  ]);
  if (!restaurant?.isActive || !restaurant.provider.isActive || !item?.isAvailable) notFound();
  const action = restaurant.acceptingOrders && supportsDemoOrdering(restaurant.provider)
    ? checkout.bind(null, restaurantId, itemId, item.updatedAt.getTime()) : undefined;
  return (
    <>
      <Link href={`/restaurants/${restaurantId}`} className="text-sm underline underline-offset-4">{restaurant.name} 메뉴</Link>
      <h1 className="mb-2 mt-5 text-3xl font-bold">{item.name}</h1>
      {item.category && <p className="text-sm text-neutral-500">{item.category}</p>}
      {item.description && <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{item.description}</p>}
      <div className="mt-6"><CheckoutForm item={item} requestId={randomUUID()} action={action} /></div>
    </>
  );
}
