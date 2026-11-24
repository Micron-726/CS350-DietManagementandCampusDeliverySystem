import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink } from "@/components/button-link";
import { BackLink, PageHeading, PageLoading, PageMain } from "@/components/page-ui";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { requireAccount } from "@/lib/auth";
import { isUuid } from "@/lib/menu";
import { dateInKorea } from "@/lib/korea-date";
import { loadMenuItem, supportsDemoOrdering } from "@/lib/menu-data";
import { MenuOptions } from "./menu-options";

type Props = Pick<PageProps<"/restaurants/[restaurantId]/[itemId]">, "params">;

export default function Page({ params }: Props) {
  return (
    <PageMain className="max-w-5xl">
      <Suspense fallback={<PageLoading />}><MenuDetails params={params} /></Suspense>
    </PageMain>
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
      <BackLink href={`/restaurants/${restaurantId}`}>{restaurant.name} 메뉴</BackLink>
      <div className="flex flex-col gap-3">
        <PageHeading title={item.name} />
        {(item.category || item.serviceDate) && (
          <div className="flex flex-wrap items-center gap-2">
            {item.category && <Badge variant="secondary">{item.category}</Badge>}
            {item.serviceDate && <time className="text-sm text-muted-foreground" dateTime={item.serviceDate}>{item.serviceDate}</time>}
          </div>
        )}
        {item.description && <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
        {item.sourceUrl && (
          <ButtonLink href={item.sourceUrl} size="sm" variant="outline" className="self-start">
            KAIST 공식 식단<ExternalLink data-icon="inline-end" />
          </ButtonLink>
        )}
      </div>
      <MenuOptions key={`${item.id}:${item.updatedAt.getTime()}`} item={item} bagCustomerId={bagCustomerId} />
    </>
  );
}
