"use client";

import { CircleCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { InputField } from "@/components/form-fields";
import { ErrorMessage } from "@/components/page-ui";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { MIN_PASSWORD_LENGTH, isKaistEmail, normalizeEmail } from "@/lib/account-validation";
import { signup, type SignupState } from "./actions";

const initialState: SignupState = { error: null, email: "" };

type Verification = { status: "idle" } | { status: "sent"; email: string } | { status: "invalid" };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [email, setEmail] = useState(state.email);
  const [verification, setVerification] = useState<Verification>({ status: "idle" });

  // Simulate KAIST email verification. The server still checks the domain on signup.
  function verify() {
    const normalized = normalizeEmail(email);
    setVerification(isKaistEmail(normalized) ? { status: "sent", email: normalized } : { status: "invalid" });
  }

  const verified = verification.status === "sent" && verification.email === normalizeEmail(email);
  const invalid = verification.status === "invalid";

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor="signup-email">KAIST 이메일</FieldLabel>
          <InputGroup>
            <InputGroupInput id="signup-email" name="email" type="email" required autoComplete="email"
              placeholder="아이디@kaist.ac.kr" value={email} aria-invalid={invalid || undefined}
              aria-describedby={invalid ? "email-error" : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                if (invalid) setVerification({ status: "idle" });
              }} />
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="button" onClick={verify} aria-pressed={verified} variant={verified ? "secondary" : "outline"}>
                {verified ? "인증 완료" : "인증"}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {verified && <p role="status" className="flex items-center gap-1.5 text-sm text-primary"><CircleCheck className="size-4" />인증되었습니다.</p>}
          {invalid && <FieldError id="email-error">@kaist.ac.kr 이메일만 인증할 수 있습니다.</FieldError>}
        </Field>
        <InputField label="비밀번호" name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password"
          placeholder={`${MIN_PASSWORD_LENGTH}자 이상`} />
        <InputField label="비밀번호 확인" name="passwordConfirm" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
        {state.error && <ErrorMessage>{state.error}</ErrorMessage>}
        <Button type="submit" size="lg" disabled={pending}>{pending ? "가입 중…" : "회원가입"}</Button>
      </FieldGroup>
    </form>
  );
}
