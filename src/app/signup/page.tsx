import { Suspense } from "react";
import Link from "next/link";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { SignupForm } from "./signup-form";

/** Student sign-up (FR-01). Stores apply by mail instead: see /signup/store. */
export default function SignupPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <Link href="/login" className="text-sm text-neutral-500">← 로그인</Link>
      <h1 className="mt-4 mb-2 text-2xl font-semibold">학생 회원가입</h1>
      <p className="mb-6 text-sm text-neutral-500">KAIST 구성원만 가입할 수 있습니다.</p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-neutral-500">
        이미 계정이 있으신가요? <Link href="/login/student" className="underline">학생 로그인</Link>
        <br />
        식당 운영자이신가요? <Link href="/signup/store" className="underline">가게 계정 신청</Link>
      </p>
    </main>
  );
}
