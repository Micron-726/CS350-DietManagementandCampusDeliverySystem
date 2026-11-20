import { Suspense } from "react";
import Link from "next/link";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { LoginForm } from "../login-form";

export default function StoreLoginPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <Link href="/login" className="text-sm text-neutral-500">← 계정 유형 선택</Link>
      <h1 className="mt-4 mb-6 text-2xl font-semibold">가게 로그인</h1>
      <LoginForm accountType="restaurant" />
      <p className="mt-6 text-center text-sm text-neutral-500">
        가게 계정이 없으신가요? <Link href="/signup/store" className="underline">가게 계정 신청 방법</Link>
      </p>
    </main>
  );
}
