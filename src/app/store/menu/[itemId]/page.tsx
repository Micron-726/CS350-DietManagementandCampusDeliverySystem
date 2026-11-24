import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAccount } from "@/lib/auth";
import { isUuid } from "@/lib/menu";
import { loadMenuItem } from "@/lib/menu-data";
import { saveMenu } from "../actions";
import { menuDraft } from "../draft";
import { MenuForm } from "../menu-form";

export default function Page({ params }: PageProps<"/store/menu/[itemId]">) {
  return <Suspense fallback={<p>불러오는 중…</p>}><Editor params={params} /></Suspense>;
}

async function Editor({ params }: Pick<PageProps<"/store/menu/[itemId]">, "params">) {
  await connection();
  const account = await requireAccount("restaurant");
  const { itemId } = await params;
  if (!account.restaurantId) return <p>계정에 연결된 식당이 없습니다.</p>;
  const item = isUuid(itemId) ? await loadMenuItem(account.restaurantId, itemId) : undefined;
  if (!item && itemId !== "new") notFound();

  return (
    <>
      <Link href="/store/menu" className="text-sm underline underline-offset-4">메뉴 목록</Link>
      <h1 className="my-5 text-3xl font-bold">{item ? "메뉴 편집" : "메뉴 추가"}</h1>
      <MenuForm item={item} initialComponents={menuDraft(item)} action={saveMenu.bind(null, item?.id ?? null, item?.updatedAt.getTime() ?? null)} />
    </>
  );
}
