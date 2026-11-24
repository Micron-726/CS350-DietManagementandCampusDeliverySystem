import { Mail } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/button-link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { Separator } from "@/components/ui/separator";
import { STORE_ACCOUNT_CONTACT } from "@/lib/account-validation";

const subject = "[가게 계정 신청] 가게 이름";
const requestFields = ["가게 이름", "가게 위치(건물)", "로그인에 사용할 이메일", "사용할 비밀번호", "담당자 연락처"];
const body = requestFields.map((field) => `${field}:`).join("\n");
const mailto = `mailto:${STORE_ACCOUNT_CONTACT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export default function StoreSignupPage() {
  return (
    <AuthFrame title="가게 계정 신청" description="KAIST 교내 식당은 이메일로 계정을 신청할 수 있습니다. 관리자가 확인 후 계정을 발급합니다." backLabel="로그인"
      footer={<Link href="/login/store" className="font-medium text-primary underline-offset-4 hover:underline">가게 로그인</Link>}>
      <dl className="flex flex-col gap-1.5">
        <dt className="font-medium">보낼 곳</dt>
        <dd className="wrap-anywhere text-muted-foreground">{STORE_ACCOUNT_CONTACT}</dd>
      </dl>
      <Separator />
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">신청에 필요한 정보</h2>
        <ul className="ml-4 flex list-disc flex-col gap-1 text-muted-foreground">
          {requestFields.map((field) => <li key={field}>{field}</li>)}
        </ul>
      </div>
      <ButtonLink href={mailto} size="lg"><Mail data-icon="inline-start" />메일 보내기</ButtonLink>
    </AuthFrame>
  );
}
