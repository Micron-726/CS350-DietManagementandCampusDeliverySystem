import Link from "next/link";
import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <AuthFrame title="학생 회원가입" description="KAIST 구성원만 가입할 수 있습니다." backLabel="로그인"
      footer={
        <>
          <Link href="/login/student" className="font-medium text-primary underline-offset-4 hover:underline">학생 로그인</Link>
          <span aria-hidden="true">·</span>
          <Link href="/signup/store" className="font-medium text-primary underline-offset-4 hover:underline">가게 계정 신청</Link>
        </>
      }>
      <Suspense fallback={null}><RedirectIfSignedIn /></Suspense>
      <SignupForm />
    </AuthFrame>
  );
}
