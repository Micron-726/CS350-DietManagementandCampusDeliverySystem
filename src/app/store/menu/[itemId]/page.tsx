import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAccount, selectOwnedRestaurant } from "@/lib/auth";
import { isUuid } from "@/lib/menu";
import { loadMenuItem } from "@/lib/menu-data";
import { saveMenu } from "../actions";
import { menuDraft } from "../draft";
import { MenuForm } from "../menu-form";
import { storePath } from "../../restaurant-links";

type Props = Pick<PageProps<"/store/menu/[itemId]">, "params" | "searchParams">;

export default function Page(props: Props) {
  return <Suspense fallback={<p>불러오는 중…</p>}><Editor {...props} /></Suspense>;
}

async function Editor({ params, searchParams }: Props) {
  await connection();
  const account = await requireAccount("restaurant");
  const { itemId } = await params;
  if (!account.restaurantId) return <p>계정에 연결된 식당이 없습니다.</p>;
  const restaurant = selectOwnedRestaurant(account, (await searchParams).restaurant);
  if (!restaurant) notFound();
  const item = isUuid(itemId) ? await loadMenuItem(restaurant.id, itemId) : undefined;
  if (!item && itemId !== "new") notFound();

  return (
    <>
      <Link href={storePath("/store/menu", restaurant.id)} className="text-sm underline underline-offset-4">메뉴 목록</Link>
      <h1 className="my-5 text-3xl font-bold">{item ? "메뉴 편집" : "메뉴 추가"}</h1>
      {item?.sourceUrl && <p className="mb-4 text-sm text-neutral-500">{item.serviceDate} 자동 수집 메뉴입니다. 수정한 항목은 이후 동기화에서 보존됩니다.</p>}
      <MenuForm item={item} initialComponents={menuDraft(item)} action={saveMenu.bind(null, restaurant.id, item?.id ?? null, item?.updatedAt.getTime() ?? null)} />
    </>
  );
}
