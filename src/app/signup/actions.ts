"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/auth-errors";
import { HOME_BY_ROLE } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH, isKaistEmail, normalizeEmail } from "@/lib/account-validation";

export type SignupState = { error: string | null; email: string };

/**
 * Student (customer) sign-up only (FR-01). KAIST verification is faked: the "인증" button on the
 * form always succeeds and no mail is sent, so only the domain is checked here.
 * Store accounts are created by an admin (`admin_create_account`), never here: the
 * handle_new_user trigger makes every self sign-up a customer.
 */
export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!isKaistEmail(email)) {
    return { error: "@kaist.ac.kr 이메일로만 가입할 수 있습니다.", email };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`, email };
  }
  if (password !== passwordConfirm) {
    return { error: "비밀번호와 비밀번호 확인이 일치하지 않습니다.", email };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: authErrorMessage(error), email };
  // Email confirmation is off (config.toml), so sign-up signs the user in right away.
  if (!data.session) {
    return { error: "가입은 되었지만 로그인하지 못했습니다. 로그인 화면에서 다시 시도해 주세요.", email };
  }

  revalidatePath("/", "layout");
  redirect(HOME_BY_ROLE.customer);
}
