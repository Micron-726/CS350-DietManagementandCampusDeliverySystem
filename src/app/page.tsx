import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { logout } from "./login/actions";

export default function Home() {
  return (
    <main className="p-6">
      {/* Session + DB reads happen at request time, so they stream in behind a boundary. */}
      <Suspense fallback={<p>Loading…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  // Per-user data: render only for a real request. With partialPrefetching on, cookies() still
  // resolves while Next prerenders the prefetch shell, and supabase-js then reads Date.now()
  // (token expiry checks) and we read new Date() for "today", which Next rejects in a prerender.
  await connection();

  // Student home. Store accounts are sent to /store.
  const account = await requireAccount("customer");
  const supabase = await createClient();

  // personal → supabase-js (RLS applies)
  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Seoul",
  });
  const { data: logs } = await supabase
    .from("meal_logs")
    .select("name, kcal, protein_g")
    .eq("log_date", today);

  // global → Drizzle (server only)
  const menu = await db
    .select()
    .from(menuItems)
    .orderBy(asc(menuItems.name))
    .limit(10);

  return (
    <>
      <p>Signed in as {account.email}</p>
      <nav aria-label="학생 메뉴" className="my-3 flex flex-wrap gap-4 text-sm underline underline-offset-4">
        <Link href="/account">내 계정</Link>
        <Link href="/restaurants">교내 식당</Link>
        <Link href="/orders">내 주문</Link>
      </nav>
      <pre>{JSON.stringify({ logs, menu }, null, 2)}</pre>
      <form action={logout}>
        <button className="rounded border px-3 py-1">Log out</button>
      </form>
    </>
  );
}
