import { Suspense } from "react";
import Link from "next/link";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { LoginForm } from "../login-form";

export default function StudentLoginPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <Link href="/login" className="text-sm text-neutral-500">← 계정 유형 선택</Link>
      <h1 className="mt-4 mb-6 text-2xl font-semibold">학생 로그인</h1>
      <LoginForm accountType="customer" />
      <p className="mt-6 text-center text-sm text-neutral-500">
        처음이신가요? <Link href="/signup" className="underline">학생 회원가입</Link>
      </p>
    </main>
  );
}
