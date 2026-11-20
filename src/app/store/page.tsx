import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { requireAccount } from "@/lib/auth";
import { logout } from "../login/actions";

/**
 * Store home — placeholder. Menu / order management (part D) goes under /store/*.
 * Every store page and store Server Action starts with `await requireAccount("restaurant")`.
 */
export default function StorePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <Suspense fallback={<p>불러오는 중…</p>}>
        <StoreHome />
      </Suspense>
    </main>
  );
}

async function StoreHome() {
  await connection();
  const account = await requireAccount("restaurant");
  const [restaurant] = account.restaurantId
    ? await db
        .select({ name: restaurants.name })
        .from(restaurants)
        .where(eq(restaurants.id, account.restaurantId))
        .limit(1)
    : [];

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">{restaurant?.name ?? "가게 관리"}</h1>
      <p className="mb-6 text-sm text-neutral-500">{account.email}</p>
      {!restaurant && (
        <p className="mb-6 rounded border p-3 text-sm">
          아직 이 계정에 연결된 식당이 없습니다. 관리자에게 문의해 주세요.
        </p>
      )}
      <p className="mb-8 text-sm text-neutral-500">메뉴·주문 관리 화면은 준비 중입니다.</p>
      <div className="flex gap-2">
        <Link href="/account" className="rounded border px-3 py-1">내 계정</Link>
        <form action={logout}>
          <button className="rounded border px-3 py-1">로그아웃</button>
        </form>
      </div>
    </>
  );
}
