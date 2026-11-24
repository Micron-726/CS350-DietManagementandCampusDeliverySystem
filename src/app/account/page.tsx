import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { HOME_BY_ROLE, requireAccount } from "@/lib/auth";
import { logout } from "../login/actions";
import { DeleteAccountForm } from "./delete-account-form";

export default function AccountPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">내 계정</h1>
      <Suspense fallback={<p>불러오는 중…</p>}>
        <AccountDetails />
      </Suspense>
    </main>
  );
}

async function AccountDetails() {
  await connection();
  const account = await requireAccount();
  return (
    <>
      <dl className="mb-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-neutral-500">이메일</dt>
        <dd className="break-all">{account.email}</dd>
        <dt className="text-neutral-500">계정 유형</dt>
        <dd>{account.role === "restaurant" ? "가게" : "학생"}</dd>
        {account.role === "restaurant" && (
          <>
            <dt className="text-neutral-500">식당</dt>
            <dd>{account.restaurants.map(({ name }) => name).join(", ") || "연결된 식당 없음"}</dd>
          </>
        )}
      </dl>

      <div className="mb-10 flex gap-2">
        <Link href={HOME_BY_ROLE[account.role]} className="flex-1 rounded border p-2 text-center">
          처음 화면
        </Link>
        <form action={logout} className="flex-1">
          <button className="w-full rounded border p-2">로그아웃</button>
        </form>
      </div>

      <section className="rounded-lg border border-red-300 p-4">
        <h2 className="mb-2 font-medium">회원 탈퇴</h2>
        <p className="mb-4 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          {account.role === "restaurant"
            ? "가게 계정이 삭제됩니다. 식당과 메뉴 정보는 남고 계정 연결만 끊깁니다."
            : "프로필, 목표, 식사·체중 기록, 검색·주문 내역이 모두 삭제되며 되돌릴 수 없습니다."}
        </p>
        <DeleteAccountForm />
      </section>
    </>
  );
}
