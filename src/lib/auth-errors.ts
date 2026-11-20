import "server-only";
import type { AuthError } from "@supabase/supabase-js";

/** Turns a Supabase Auth error into a message a user can act on (NFR-17). */
export function authErrorMessage(error: AuthError): string {
  // The handle_new_user trigger raised (non-KAIST email that got past the form). Auth reports
  // this as a 500 without an error code.
  if (error.message === "Database error saving new user") {
    return "@kaist.ac.kr 이메일로만 가입할 수 있습니다.";
  }
  switch (error.code) {
    case "invalid_credentials":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "user_already_exists":
    case "email_exists":
      return "이미 가입된 이메일입니다. 로그인해 주세요.";
    case "weak_password":
      return "비밀번호가 너무 짧거나 단순합니다. 6자 이상으로 입력해 주세요.";
    case "email_address_invalid":
      return "올바른 이메일 주소가 아닙니다.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    case "signup_disabled":
      return "지금은 회원가입을 받지 않습니다.";
    default:
      console.error("Supabase Auth error", error.code, error.status, error.message);
      return "처리 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";
  }
}
