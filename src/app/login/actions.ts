"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { HOME_BY_ROLE, type AccountRole } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth-errors";
import { isKaistEmail, normalizeEmail } from "@/lib/account-validation";

export type LoginState = { error: string | null; email: string };

const WRONG_TAB: Record<AccountRole, string> = {
  customer: "학생 계정입니다. '학생 로그인'에서 로그인해 주세요.",
  restaurant: "가게 계정입니다. '가게 로그인'에서 로그인해 주세요.",
};

/** One action for both login screens. The hidden `accountType` field says which one was used. */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const accountType: AccountRole =
    formData.get("accountType") === "restaurant" ? "restaurant" : "customer";
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해 주세요.", email };
  }
  if (accountType === "customer" && !isKaistEmail(email)) {
    return { error: "학생 계정은 @kaist.ac.kr 이메일로 로그인해 주세요.", email };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error), email };

  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, data.user.id))
    .limit(1);
  if (!profile) {
    await supabase.auth.signOut();
    return { error: "계정 정보를 찾을 수 없습니다. 관리자에게 문의해 주세요.", email };
  }
  // A student account on the store screen (or the other way round): don't keep the session.
  if (profile.role !== accountType) {
    await supabase.auth.signOut();
    return { error: WRONG_TAB[profile.role], email };
  }

  revalidatePath("/", "layout");
  redirect(HOME_BY_ROLE[profile.role]);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
