"use client";

import { useActionState } from "react";
import { InputField } from "@/components/form-fields";
import { ErrorMessage } from "@/components/page-ui";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm({ accountType }: { accountType: "customer" | "restaurant" }) {
  const [state, formAction, pending] = useActionState(login, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="accountType" value={accountType} />
      <FieldGroup>
        <InputField label="이메일" name="email" type="email" required autoComplete="username" defaultValue={state.email}
          placeholder={accountType === "customer" ? "아이디@kaist.ac.kr" : "가게 계정 이메일"} />
        <InputField label="비밀번호" name="password" type="password" required autoComplete="current-password" />
        {state.error && <ErrorMessage>{state.error}</ErrorMessage>}
        <Button type="submit" size="lg" disabled={pending}>{pending ? "로그인 중…" : "로그인"}</Button>
      </FieldGroup>
    </form>
  );
}
