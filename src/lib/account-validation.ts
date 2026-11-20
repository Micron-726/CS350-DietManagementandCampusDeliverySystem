/**
 * Account input rules, shared by the forms (instant feedback) and the Server Actions (the real
 * check, NFR-07). The database trigger `handle_new_user` checks the KAIST domain once more.
 */

export const KAIST_DOMAIN = "kaist.ac.kr";
export const MIN_PASSWORD_LENGTH = 6; // supabase/config.toml [auth] minimum_password_length

/** Where stores send their account request (there is no self sign-up for stores). */
export const STORE_ACCOUNT_CONTACT = "min_070206@kaist.ac.kr";

/** Typed by the user to confirm leaving the service. */
export const DELETE_CONFIRM_TEXT = "탈퇴";

export function normalizeEmail(value: FormDataEntryValue | string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

export function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Expects a normalized email (see `normalizeEmail`). */
export function isKaistEmail(email: string): boolean {
  return /^[^\s@]+@kaist\.ac\.kr$/.test(email);
}
