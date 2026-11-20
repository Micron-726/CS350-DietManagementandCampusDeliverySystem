"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm({ accountType }: { accountType: "customer" | "restaurant" }) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const isStudent = accountType === "customer";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="accountType" value={accountType} />
      <label className="flex flex-col gap-1 text-sm">
        이메일
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue={state.email}
          placeholder={isStudent ? "아이디@kaist.ac.kr" : "가게 계정 이메일"}
          className="rounded border p-2 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        비밀번호
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
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
        {pending ? "로그인 중…" : "로그인"}
      </button>
    </form>
  );
}
