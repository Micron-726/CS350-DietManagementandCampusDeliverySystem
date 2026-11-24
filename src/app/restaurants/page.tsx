import { ArrowUpRight, CookingPot, MapPin, Store } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContentEmpty, PageHeading, PageLoading, PageMain } from "@/components/page-ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { requireAccount } from "@/lib/auth";
import { supportsDemoOrdering } from "@/lib/menu-data";

export default function Page() {
  return (
    <PageMain>
      <Suspense fallback={<PageLoading />}><RestaurantList /></Suspense>
    </PageMain>
  );
}

async function RestaurantList() {
  await connection();
  await requireAccount("customer");
  const list = await db.query.restaurants.findMany({
    where: (restaurant, { eq }) => eq(restaurant.isActive, true),
    orderBy: (restaurant, { asc }) => [asc(restaurant.campusArea), asc(restaurant.name)],
    with: { provider: true },
  });
  const active = list.filter(({ provider }) => provider.isActive);

  return (
    <>
      <PageHeading title="교내 식당" description="KAIST 식당의 위치, 메뉴와 주문 가능 여부를 확인하세요." />
      {active.length === 0 ? <ContentEmpty icon={Store} title="등록된 식당이 없습니다." /> : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((restaurant) => {
            const orderable = restaurant.acceptingOrders && supportsDemoOrdering(restaurant.provider);
            const Icon = orderable ? Store : CookingPot;
            return (
              <li key={restaurant.id} className="min-w-0">
                <Link href={`/restaurants/${restaurant.id}`} className="group/restaurant block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  <Card className="h-full transition group-hover/restaurant:ring-primary/45">
                    <CardHeader>
                      <div className="mb-2 grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                        <Icon className="size-5" aria-hidden="true" />
                      </div>
                      <CardTitle><h2 className="font-semibold">{restaurant.name}</h2></CardTitle>
                      <CardDescription className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        {restaurant.address ?? restaurant.campusArea ?? "위치 정보 없음"}
                      </CardDescription>
                      <CardAction><ArrowUpRight className="size-4 text-muted-foreground transition group-hover/restaurant:text-primary" aria-hidden="true" /></CardAction>
                    </CardHeader>
                    <CardFooter className="mt-auto justify-between gap-3">
                      <Badge variant={orderable ? "secondary" : "outline"}>{orderable ? "모의 주문 가능" : "메뉴 조회"}</Badge>
                      <span className="text-xs font-medium text-muted-foreground">메뉴 보기</span>
                    </CardFooter>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
