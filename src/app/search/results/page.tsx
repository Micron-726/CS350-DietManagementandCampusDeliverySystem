import { connection } from "next/server";
import { Suspense } from "react";
import { searchMeals } from "@/lib/search";
import type { Priority, SearchCriteria } from "@/lib/ranking";

type Params = Promise<Record<string, string | string[] | undefined>>;

const num = (v: string | string[] | undefined) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return v && Number.isFinite(n) && n > 0 ? n : undefined;
};

async function Results({ searchParams }: { searchParams: Params }) {
  await connection();
  const sp = await searchParams;

  const priority = (Array.isArray(sp.priority) ? sp.priority[0] : sp.priority) as Priority;
  const criteria: SearchCriteria = {
    targetKcal: num(sp.kcal),
    targetProteinG: num(sp.protein),
    maxPriceKrw: num(sp.price),
    maxDistanceM: num(sp.distance),
    priority: priority ?? "balanced",
  };

  if (!criteria.targetKcal && !criteria.targetProteinG) {
    return <p className="text-red-600">Please enter calories or protein.</p>;
  }

  // no user location yet, so the distance limit is ignored for now
  const { results, widenFactor, restaurantInfo } = await searchMeals(criteria);

  if (results.length === 0) return <p>No meals found.</p>;

  return (
    <div className="space-y-3">
      {widenFactor > 1 && (
        <p className="text-sm text-amber-700">
          No exact matches, so the range was widened to {widenFactor}x.
        </p>
      )}
      {results.map((r) => (
        <div key={r.candidate.menuItemId} className="rounded border p-4">
          <div className="flex justify-between">
            <h2 className="font-semibold">{r.candidate.name}</h2>
            <span className="text-sm text-gray-500">
              {restaurantInfo[r.candidate.restaurantId]?.name}
            </span>
          </div>
          <p className="text-sm">
            {r.totalKcal ?? "?"} kcal · {r.totalProteinG ?? "?"} g protein ·{" "}
            {r.totalPriceKrw.toLocaleString()} KRW
          </p>
          {r.selection.length > 0 && (
            <p className="text-xs text-gray-500">
              {r.selection.map((s) => `${s.componentName}: ${s.label}`).join(", ")}
            </p>
          )}
          {r.violations.length > 0 && (
            <p className="text-xs text-red-600">Misses: {r.violations.join(", ")}</p>
          )}
          {!r.exact && <p className="text-xs text-gray-400">Nutrition values are estimates</p>}
        </div>
      ))}
    </div>
  );
}

export default function ResultsPage({ searchParams }: { searchParams: Params }) {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Results</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}