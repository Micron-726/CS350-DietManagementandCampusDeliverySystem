import { Info, Store } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackLink, ContentEmpty, PageHeading, PageLoading } from "@/components/page-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireAccount, selectOwnedRestaurant } from "@/lib/auth";
import { isUuid } from "@/lib/menu";
import { loadMenuItem } from "@/lib/menu-data";
import { saveMenu } from "../actions";
import { menuDraft } from "../draft";
import { MenuForm } from "../menu-form";
import { storePath } from "../../restaurant-links";

type Props = Pick<PageProps<"/store/menu/[itemId]">, "params" | "searchParams">;

export default function Page(props: Props) {
  return <Suspense fallback={<PageLoading />}><Editor {...props} /></Suspense>;
}

async function Editor({ params, searchParams }: Props) {
  await connection();
  const account = await requireAccount("restaurant");
  const { itemId } = await params;
  if (!account.restaurantId) return <ContentEmpty icon={Store} title="계정에 연결된 식당이 없습니다." />;
  const restaurant = selectOwnedRestaurant(account, (await searchParams).restaurant);
  if (!restaurant) notFound();
  const item = isUuid(itemId) ? await loadMenuItem(restaurant.id, itemId) : undefined;
  if (!item && itemId !== "new") notFound();

  return (
    <>
      <BackLink href={storePath("/store/menu", restaurant.id)}>메뉴 목록</BackLink>
      <PageHeading title={item ? "메뉴 편집" : "메뉴 추가"} description={item ? `${restaurant.name} · ${item.name}` : restaurant.name} />
      {item?.sourceUrl && <Alert role="note"><Info /><AlertDescription>{item.serviceDate} 자동 수집 메뉴입니다. 수정한 항목은 이후 동기화에서 보존됩니다.</AlertDescription></Alert>}
      <MenuForm key={`${restaurant.id}:${itemId}`} item={item} initialComponents={menuDraft(item)} action={saveMenu.bind(null, restaurant.id, item?.id ?? null, item?.updatedAt.getTime() ?? null)} />
    </>
  );
}
