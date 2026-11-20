"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { createClient } from "@/lib/supabase/server";
import { requireAccount } from "@/lib/auth";
import { DELETE_CONFIRM_TEXT } from "@/lib/account-validation";

export type DeleteAccountState = { error: string | null };

/**
 * Leave the service (OR-02, NFR-08). Deleting the auth user cascades to the profile, goals,
 * meal/weight logs, searches and orders. A store's restaurant stays, with owner_id set to null.
 */
export async function deleteAccount(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const account = await requireAccount();
  if (String(formData.get("confirm") ?? "").trim() !== DELETE_CONFIRM_TEXT) {
    return { error: `확인을 위해 '${DELETE_CONFIRM_TEXT}'를 정확히 입력해 주세요.` };
  }

  try {
    await db.execute(sql`delete from auth.users where id = ${account.id}`);
  } catch (e) {
    console.error("deleteAccount failed", e);
    return { error: "탈퇴 처리 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요." };
  }

  // The user is gone, so the server-side sign-out may fail; the local session is cleared anyway.
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?deleted=1");
}
