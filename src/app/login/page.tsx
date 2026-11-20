import { Suspense } from "react";
import Link from "next/link";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";

type SearchParams = Promise<{ deleted?: string }>;

/** Step 1 of login: choose the account type. */
export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
        <DeletedNotice searchParams={searchParams} />
      </Suspense>

      <h1 className="mb-2 text-2xl font-semibold">로그인</h1>
      <p className="mb-6 text-sm text-neutral-500">계정 유형을 선택해 주세요.</p>

      <div className="flex flex-col gap-3">
        <Link href="/login/student" className="rounded-lg border p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900">
          <span className="block font-medium">학생 로그인</span>
          <span className="text-sm text-neutral-500">@kaist.ac.kr 계정으로 식단 관리·메뉴 검색</span>
        </Link>
        <Link href="/login/store" className="rounded-lg border p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900">
          <span className="block font-medium">가게 로그인</span>
          <span className="text-sm text-neutral-500">교내 식당 메뉴·주문 관리</span>
        </Link>
      </div>

      <p className="mt-8 text-center text-sm text-neutral-500">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="underline">학생 회원가입</Link>
        {" · "}
        <Link href="/signup/store" className="underline">가게 계정 신청</Link>
      </p>
    </main>
  );
}

async function DeletedNotice({ searchParams }: { searchParams: SearchParams }) {
  const { deleted } = await searchParams;
  return deleted ? (
    <p role="status" className="mb-6 rounded border p-3 text-sm">
      탈퇴가 완료되었습니다. 계정과 기록이 모두 삭제되었습니다.
    </p>
  ) : null;
}
