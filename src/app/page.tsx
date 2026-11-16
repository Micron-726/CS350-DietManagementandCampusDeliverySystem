import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { asc } from "drizzle-orm";
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

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

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
      <p>Signed in as {claims?.claims.email}</p>
      <pre>{JSON.stringify({ logs, menu }, null, 2)}</pre>
      <form action={logout}>
        <button className="rounded border px-3 py-1">Log out</button>
      </form>
    </>
  );
}
