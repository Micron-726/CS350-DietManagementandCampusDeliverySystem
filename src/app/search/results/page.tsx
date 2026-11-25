
import { connection } from "next/server";
import { Suspense } from "react";
import { searchMeals } from "@/lib/search";
import type { Priority, SearchCriteria } from "@/lib/ranking";
import MealCard from "./mealcard";
import MapLoader from "./map-loader";

type Params = Promise<Record<string, string | string[] | undefined>>;

const num = (v: string | string[] | undefined) => {
  const value = Array.isArray(v) ? v[0] : v;
  if (value === undefined || value.trim() === "") return undefined;

  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const coord = (v: string | string[] | undefined) => {
  const value = Array.isArray(v) ? v[0] : v;
  if (value === undefined || value.trim() === "") return undefined;

  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const validPriorities: Priority[] = [
  "balanced",
  "calories",
  "protein",
  "price",
  "distance",
];

async function Results({ searchParams }: { searchParams: Params }) {
  await connection();

  const sp = await searchParams;

  const rawPriority = Array.isArray(sp.priority)
    ? sp.priority[0]
    : sp.priority;

  const priority: Priority = validPriorities.includes(
    rawPriority as Priority
  )
    ? (rawPriority as Priority)
    : "balanced";

  const criteria: SearchCriteria = {
    targetKcal: num(sp.kcal),
    targetProteinG: num(sp.protein),
    maxPriceKrw: num(sp.price),
    maxDistanceM: num(sp.distance),
    priority,
  };

  if (!criteria.targetKcal && !criteria.targetProteinG) {
    return (
      <p className="text-red-600">
        Please enter calories or protein.
      </p>
    );
  }

  const lat = coord(sp.lat);
  const lng = coord(sp.lng);

  const location =
    lat !== undefined &&
    lng !== undefined &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
      ? { lat, lng }
      : undefined;

  const { results, widenFactor, restaurantInfo } =
    await searchMeals(criteria, location);

  // Include restaurants that have matching meals and valid coordinates.
  const places = Object.values(restaurantInfo)
    .filter(
      (r) =>
        r.lat !== null &&
        r.lng !== null &&
        results.some(
          (x) => x.candidate.restaurantId === r.id
        )
    )
    .map((r) => ({
      id: r.id,
      name: r.name,
      lat: r.lat as number,
      lng: r.lng as number,
    }));

  return (
    <div className="space-y-3">
      {criteria.maxDistanceM !== undefined && !location && (
        <p className="text-sm text-amber-700">
          Distance limit ignored because your location is off.
        </p>
      )}

      {widenFactor > 1 && (
        <p className="text-sm text-amber-700">
          No exact matches, so the range was widened to {widenFactor}x.
        </p>
      )}

      <MapLoader places={places} user={location} />

      {results.map((r) => (
        <MealCard
          key={r.candidate.menuItemId}
          result={r}
          restaurantName={
            restaurantInfo[r.candidate.restaurantId]?.name
          }
          targetKcal={criteria.targetKcal}
          targetProteinG={criteria.targetProteinG}
        />
      ))}
    </div>
  );
}

export default function ResultsPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-bold">
        Results
      </h1>

      <Suspense fallback={<p>Loading...</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
