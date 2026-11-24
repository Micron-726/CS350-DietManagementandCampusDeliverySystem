"use client";

import { useActionState } from "react";
import { InputField } from "@/components/form-fields";
import { ErrorMessage } from "@/components/page-ui";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { DELETE_CONFIRM_TEXT } from "@/lib/account-validation";
import { deleteAccount, type DeleteAccountState } from "./actions";

const initialState: DeleteAccountState = { error: null };

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccount, initialState);

  return (
    <form action={formAction}>
      <FieldGroup>
        <InputField label={`확인을 위해 ‘${DELETE_CONFIRM_TEXT}’를 입력해 주세요.`} name="confirm"
          required autoComplete="off" placeholder={DELETE_CONFIRM_TEXT} />
        {state.error && <ErrorMessage>{state.error}</ErrorMessage>}
        <Button type="submit" disabled={pending} variant="destructive" className="self-start">
          {pending ? "탈퇴 처리 중…" : "탈퇴하기"}
        </Button>
      </FieldGroup>
    </form>
  );
}
