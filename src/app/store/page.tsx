import { ClipboardList, LayoutGrid, MapPin, Store } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink } from "@/components/button-link";
import { LogoutForm } from "@/components/logout-form";
import { ContentEmpty, PageHeading, PageLoading } from "@/components/page-ui";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAccount } from "@/lib/auth";
import { storePath } from "./restaurant-links";

export default function StorePage() {
  return <Suspense fallback={<PageLoading />}><StoreHome /></Suspense>;
}

async function StoreHome() {
  await connection();
  const account = await requireAccount("restaurant");
  return (
    <>
      <PageHeading title={account.displayName ?? account.restaurants[0]?.name ?? "가게 관리"} description="연결된 식당의 메뉴와 주문을 관리하세요." action={<LogoutForm />} />
      {account.restaurants.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {account.restaurants.map((restaurant) => (
            <li key={restaurant.id} className="min-w-0">
              <Card className="h-full">
                <CardHeader>
                  <div className="mb-2 grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Store className="size-5" /></div>
                  <CardTitle><h2>{restaurant.name}</h2></CardTitle>
                  <CardDescription className="flex items-start gap-1.5 wrap-anywhere">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />{restaurant.address ?? restaurant.campusArea ?? account.email}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto flex-wrap gap-2">
                  <ButtonLink href={storePath("/store/menu", restaurant.id)}><LayoutGrid data-icon="inline-start" />메뉴 관리</ButtonLink>
                  <ButtonLink href={storePath("/store/orders", restaurant.id)} variant="outline"><ClipboardList data-icon="inline-start" />주문 관리</ButtonLink>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      ) : <ContentEmpty icon={Store} title="연결된 식당이 없습니다." description="식당 연결은 관리자에게 문의해 주세요." />}
    </>
  );
}
