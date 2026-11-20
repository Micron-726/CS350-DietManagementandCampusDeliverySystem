"use client";

import { useActionState, useState } from "react";
import { signup, type SignupState } from "./actions";
import { MIN_PASSWORD_LENGTH, isKaistEmail, normalizeEmail } from "@/lib/account-validation";

const initialState: SignupState = { error: null, email: "" };

type Verification = { status: "idle" } | { status: "sent"; email: string } | { status: "invalid" };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [email, setEmail] = useState(state.email);
  const [verification, setVerification] = useState<Verification>({ status: "idle" });

  // Fake KAIST verification: no mail is sent and every @kaist.ac.kr address counts as verified.
  // Sign-up doesn't wait for this button; the server checks the domain either way.
  function verify() {
    const normalized = normalizeEmail(email);
    setVerification(isKaistEmail(normalized) ? { status: "sent", email: normalized } : { status: "invalid" });
  }

  const verified = verification.status === "sent" && verification.email === normalizeEmail(email);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 text-sm">
        <label htmlFor="signup-email">KAIST 이메일</label>
        <div className="flex gap-2">
          <input
            id="signup-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="아이디@kaist.ac.kr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-0 flex-1 rounded border p-2 text-base"
          />
          <button
            type="button"
            onClick={verify}
            aria-pressed={verified}
            className={
              verified
                ? "shrink-0 rounded border border-green-600 bg-green-600 px-3 text-sm text-white"
                : "shrink-0 rounded border px-3 text-sm"
            }
          >
            {verified ? "✓ 인증 완료" : "인증"}
          </button>
        </div>
      </div>
      {verified && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          인증되었습니다.
        </p>
      )}
      {verification.status === "invalid" && (
        <p role="alert" className="text-sm text-red-600">
          @kaist.ac.kr 이메일만 인증할 수 있습니다.
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        비밀번호
        <input
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
          className="rounded border p-2 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        비밀번호 확인
        <input
          name="passwordConfirm"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className="rounded border p-2 text-base"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded bg-black p-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "가입 중…" : "회원가입"}
      </button>
    </form>
  );
}
