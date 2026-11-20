import Link from "next/link";
import { STORE_ACCOUNT_CONTACT } from "@/lib/account-validation";

/**
 * Store accounts are not self-service: the app only covers on-campus restaurants, so an admin
 * checks each request and creates the account (`admin_create_account` in the account migration).
 */
const subject = "[가게 계정 신청] 가게 이름";
const body = [
  "가게 이름:",
  "가게 위치(건물):",
  "로그인에 사용할 이메일:",
  "사용할 비밀번호:",
  "담당자 연락처:",
].join("\n");
const mailto = `mailto:${STORE_ACCOUNT_CONTACT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export default function StoreSignupPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <Link href="/login" className="text-sm text-neutral-500">← 로그인</Link>
      <h1 className="mt-4 mb-4 text-2xl font-semibold">가게 계정 신청</h1>
      <p className="mb-4 text-sm leading-6">
        이 서비스는 KAIST 교내 식당만 다룹니다. 가게 계정은 직접 가입할 수 없고, 아래 주소로 신청하시면
        확인 후 계정을 만들어 드립니다.
      </p>

      <div className="mb-4 rounded-lg border p-4 text-sm">
        <p className="mb-2 font-medium">보낼 곳</p>
        <p className="mb-4 font-mono">{STORE_ACCOUNT_CONTACT}</p>
        <p className="mb-2 font-medium">적어 주실 내용</p>
        <ul className="list-inside list-disc leading-6">
          <li>가게 이름</li>
          <li>가게 위치(건물)</li>
          <li>로그인에 사용할 이메일</li>
          <li>사용할 비밀번호</li>
          <li>담당자 연락처</li>
        </ul>
      </div>

      <a
        href={mailto}
        className="block rounded bg-black p-2 text-center text-white dark:bg-white dark:text-black"
      >
        메일 보내기
      </a>
      <p className="mt-6 text-center text-sm text-neutral-500">
        계정을 받으셨나요? <Link href="/login/store" className="underline">가게 로그인</Link>
      </p>
    </main>
  );
}
