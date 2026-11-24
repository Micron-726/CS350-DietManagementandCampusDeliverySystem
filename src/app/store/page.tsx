import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireAccount } from "@/lib/auth";
import { logout } from "../login/actions";
import { storePath } from "./restaurant-links";

export default function StorePage() {
  return <Suspense fallback={<p>불러오는 중…</p>}><StoreHome /></Suspense>;
}

async function StoreHome() {
  await connection();
  const account = await requireAccount("restaurant");
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">{account.displayName ?? account.restaurants[0]?.name ?? "가게 관리"}</h1>
      {account.restaurants.length ? (
        <ul className="mb-8 grid gap-4 sm:grid-cols-2">
          {account.restaurants.map((restaurant) => (
            <li key={restaurant.id} className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
              <h2 className="font-semibold">{restaurant.name}</h2>
              <p className="mt-2 text-sm text-neutral-500">{restaurant.address ?? restaurant.campusArea ?? account.email}</p>
              <div className="mt-4 flex gap-4 text-sm underline underline-offset-4">
                <Link href={storePath("/store/menu", restaurant.id)}>메뉴 관리</Link>
                <Link href={storePath("/store/orders", restaurant.id)}>주문 관리</Link>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="mb-6">아직 이 계정에 연결된 식당이 없습니다. 관리자에게 문의해 주세요.</p>}
      <form action={logout}><button className="rounded-md border px-3 py-2 text-sm">로그아웃</button></form>
    </>
  );
}
