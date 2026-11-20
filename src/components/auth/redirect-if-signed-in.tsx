import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentAccount, HOME_BY_ROLE } from "@/lib/auth";

/**
 * On login / sign-up screens: a signed-in user goes to their first page instead.
 * Render inside <Suspense> (it reads the session). Done here rather than in the proxy so that a
 * session without a profile (deleted account) can still reach /login without a redirect loop.
 */
export async function RedirectIfSignedIn() {
  await connection();
  const account = await getCurrentAccount();
  if (account) redirect(HOME_BY_ROLE[account.role]);
  return null;
}
