import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/app/login/login-form";
import { AuthFrame } from "@/components/auth/auth-frame";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";

export function LoginScreen({ accountType }: { accountType: "customer" | "restaurant" }) {
  const student = accountType === "customer";
  return (
    <AuthFrame title={student ? "학생 로그인" : "가게 로그인"}
      description={student ? "KAIST 이메일로 로그인하세요." : "발급받은 식당 운영자 계정으로 로그인하세요."}
      backLabel="계정 유형 선택"
      footer={
        <>
          <span>{student ? "처음이신가요?" : "가게 계정이 없으신가요?"}</span>
          <Link href={student ? "/signup" : "/signup/store"} className="font-medium text-primary underline-offset-4 hover:underline">
            {student ? "학생 회원가입" : "가게 계정 신청"}
          </Link>
        </>
      }>
      <Suspense fallback={null}><RedirectIfSignedIn /></Suspense>
      <LoginForm accountType={accountType} />
    </AuthFrame>
  );
}
