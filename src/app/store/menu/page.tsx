import { ArrowUpRight, Plus, Store, Utensils } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink } from "@/components/button-link";
import { NutritionValue } from "@/components/nutrition-value";
import { ContentEmpty, PageHeading, PageLoading } from "@/components/page-ui";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { requireAccount, selectOwnedRestaurant } from "@/lib/auth";
import { showPrice } from "@/lib/menu";
import { MENU_WITH_PORTIONS, menuPeriodOrder, menuServedOn } from "@/lib/menu-data";
import { RestaurantLinks, storePath } from "../restaurant-links";

type Props = Pick<PageProps<"/store/menu">, "searchParams">;

export default function Page({ searchParams }: Props) {
  return <Suspense fallback={<PageLoading />}><MenuList searchParams={searchParams} /></Suspense>;
}

async function MenuList({ searchParams }: Props) {
  await connection();
  const account = await requireAccount("restaurant");
  if (!account.restaurantId) return <ContentEmpty icon={Store} title="계정에 연결된 식당이 없습니다." />;
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
      <PageHeading title="메뉴 관리" description={`${restaurant.name} · 메뉴 ${menu.length}개`} action={
        <ButtonLink href={storePath("/store/menu/new", restaurantId)} size="lg"><Plus data-icon="inline-start" />메뉴 추가</ButtonLink>
      } />
      <RestaurantLinks account={account} selectedId={restaurantId} path="/store/menu" />
      {menu.length === 0 ? <ContentEmpty icon={Utensils} title="등록된 메뉴가 없습니다." /> : (
        <Card className="min-w-0 py-0">
          <Table aria-label={`${restaurant.name} 메뉴`}>
            <TableHeader className="bg-muted/60">
              <TableRow>{["메뉴", "재료 및 양", "가격", "열량", "단백질", "상태"].map((label) => (
                <TableHead key={label} scope="col" className="px-4">{label}</TableHead>
              ))}</TableRow>
            </TableHeader>
            <TableBody>
              {menu.map((item) => (
                <TableRow key={item.id}>
                  <th scope="row" className="min-w-44 px-4 py-3 text-left align-middle font-medium">
                    <Link href={storePath(`/store/menu/${item.id}`, restaurantId)} className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline">
                      {item.name}<ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
                    </Link>
                    {(item.category || item.serviceDate) && <span className="mt-1 block text-xs text-muted-foreground">{[item.category, item.serviceDate].filter(Boolean).join(" · ")}</span>}
                  </th>
                  <TableCell className="min-w-32 px-4 py-3">
                    {item.components.length > 0 ? (
                      <details>
                        <summary className="cursor-pointer underline-offset-4 hover:underline">재료 {item.components.length}개</summary>
                        <ul className="mt-1.5 flex flex-col gap-1 text-xs text-muted-foreground">
                          {item.components.map((component) => (
                            <li key={component.id}>{component.name}{component.levels.length > 0 && ` · ${component.levels.map((level) => level.label).join(", ")}`}</li>
                          ))}
                        </ul>
                      </details>
                    ) : <span className="text-muted-foreground">정보 없음</span>}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-medium tabular-nums">{showPrice(item.basePriceKrw)}</TableCell>
                  <TableCell className="px-4 py-3"><NutritionValue value={item.baseKcal} unit="kcal" source={item.kcalSource} /></TableCell>
                  <TableCell className="px-4 py-3"><NutritionValue value={item.baseProteinG} unit="g" source={item.proteinSource} /></TableCell>
                  <TableCell className="px-4 py-3"><Badge variant={item.isAvailable ? "secondary" : "outline"}>{item.isAvailable ? "판매 중" : "판매 중지"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
