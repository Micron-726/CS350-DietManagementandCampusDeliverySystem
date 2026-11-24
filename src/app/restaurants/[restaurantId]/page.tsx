import { Info, MapPin, Utensils } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { MenuListCard } from "@/components/menu-list-card";
import { BackLink, ContentEmpty, PageHeading, PageLoading, PageMain } from "@/components/page-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/db";
import { requireAccount } from "@/lib/auth";
import { isUuid } from "@/lib/menu";
import { menuPeriodOrder, menuServedOn, supportsDemoOrdering } from "@/lib/menu-data";

export default function Page({ params }: PageProps<"/restaurants/[restaurantId]">) {
  return (
    <PageMain>
      <Suspense fallback={<PageLoading />}><RestaurantMenu params={params} /></Suspense>
    </PageMain>
  );
}

async function RestaurantMenu({ params }: Pick<PageProps<"/restaurants/[restaurantId]">, "params">) {
  await connection();
  await requireAccount("customer");
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
  const location = restaurant.address ?? restaurant.campusArea;

  return (
    <>
      <BackLink href="/restaurants">식당 목록</BackLink>
      <PageHeading title={restaurant.name} description={location && (
        <span className="inline-flex items-start gap-1.5"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{location}</span>
      )} />
      {(!restaurant.acceptingOrders || !supportsDemoOrdering(restaurant.provider)) && (
        <Alert role="note"><Info /><AlertDescription>이 식당은 메뉴 조회만 가능합니다.</AlertDescription></Alert>
      )}
      {categories.size > 1 && (
        <nav aria-label="메뉴 분류" className="flex flex-wrap gap-2">
          {[...categories.keys()].map((category, index) => (
            <a key={category} href={`#category-${index}`} className={buttonVariants({ variant: "outline" })}>{category}</a>
          ))}
        </nav>
      )}
      {categories.size ? (
        <div className="flex flex-col gap-8">
          {[...categories].map(([category, items], index) => (
            <section key={category} id={`category-${index}`} className="flex scroll-mt-6 flex-col gap-3">
              <h2 className="text-xl font-semibold tracking-tight">{category}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => <MenuListCard key={item.id} restaurantId={restaurantId} item={item} />)}
              </ul>
            </section>
          ))}
        </div>
      ) : <ContentEmpty icon={Utensils} title="오늘 표시할 메뉴가 없습니다." />}
    </>
  );
}
