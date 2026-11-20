"use client";

import { useActionState } from "react";
import { deleteAccount, type DeleteAccountState } from "./actions";
import { DELETE_CONFIRM_TEXT } from "@/lib/account-validation";

const initialState: DeleteAccountState = { error: null };

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccount, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        확인을 위해 &lsquo;{DELETE_CONFIRM_TEXT}&rsquo;를 입력해 주세요.
        <input
          name="confirm"
          required
          autoComplete="off"
          placeholder={DELETE_CONFIRM_TEXT}
          className="rounded border p-2 text-base"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="rounded bg-red-600 p-2 text-white disabled:opacity-50">
        {pending ? "탈퇴 처리 중…" : "탈퇴하기"}
      </button>
    </form>
  );
}
