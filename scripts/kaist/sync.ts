import { setTimeout } from "node:timers/promises";
import { dateInKorea } from "../../src/lib/korea-date";
import { cafeteriaCodes, cafeteriaUrl, parseCafeteriaPage, providerCode } from "./cafeteria";
import { openDatabase } from "./database";

async function fetchMenu(url: URL, retry = true): Promise<string> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (response.ok) return await response.text();
    if (!retry || response.status < 500) throw new Error(`KAIST returned HTTP ${response.status}`);
  } catch (error) {
    if (!retry || !(error instanceof TypeError || (error instanceof Error && error.name === "TimeoutError"))) throw error;
  }
  await setTimeout(1500);
  return fetchMenu(url, false);
}

async function sync() {
  const [arg, ...rest] = process.argv.slice(2);
  const date = arg ?? dateInKorea();
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (rest.length || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new Error("Pass a valid YYYY-MM-DD date or omit it to sync today in Korea.");
  }

  const sql = openDatabase();
  try {
    const stores = await sql<{ id: string; external_id: string }[]>`
      select restaurant.id, restaurant.external_id from public.restaurants restaurant
      join public.providers provider on provider.id = restaurant.provider_id
      where provider.code = ${providerCode} and restaurant.external_id in ${sql(cafeteriaCodes)}
    `;
    if (stores.length !== cafeteriaCodes.length) throw new Error("Apply the KAIST cafeteria migrations first.");

    for (const code of cafeteriaCodes) {
      const store = stores.find((restaurant) => restaurant.external_id === code)!;
      const url = cafeteriaUrl(code, date);
      try {
        const { meals, confirmedClosed } = parseCafeteriaPage(await fetchMenu(url), code, date);
        if (!meals.length && !confirmedClosed) {
          console.log(`${code} ${date}: no menu published`);
          continue;
        }

        const syncedAt = new Date();
        await sql.begin(async (tx) => {
          const lockKey = `kaist-cafeteria:${store.id}:${date}`;
          await tx`select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(${lockKey}, 0))`;
          const entries = meals.map((meal) => ({
            restaurant_id: store.id, external_id: meal.externalId, name: meal.name,
            description: meal.description, category: meal.category, base_price_krw: meal.basePriceKrw,
            base_kcal: meal.baseKcal, kcal_source: meal.baseKcal === null ? "unavailable" : "provider",
            base_protein_g: meal.baseProteinG, protein_source: meal.baseProteinG === null ? "unavailable" : "provider",
            extra_nutrition: meal.extraNutrition, service_date: date, source_url: url.href,
            last_synced_at: syncedAt, is_available: meal.isAvailable,
          }));
          if (entries.length) await tx`
            insert into public.menu_items ${tx(entries)}
            on conflict (restaurant_id, external_id) do update set
              name = excluded.name, description = excluded.description, category = excluded.category,
              base_price_krw = excluded.base_price_krw, base_kcal = excluded.base_kcal,
              kcal_source = excluded.kcal_source, base_protein_g = excluded.base_protein_g,
              protein_source = excluded.protein_source, extra_nutrition = excluded.extra_nutrition,
              is_available = excluded.is_available, last_synced_at = excluded.last_synced_at
            where menu_items.last_synced_at <= excluded.last_synced_at
          `;

          // Restrict reconciliation to this date. A missing last_synced_at is an owner's manual override.
          await tx`
            update public.menu_items set is_available = false, last_synced_at = ${syncedAt}
            where restaurant_id = ${store.id} and service_date = ${date} and source_url = ${url.href}
              and last_synced_at <= ${syncedAt}
              and not (external_id = any (${entries.map(({ external_id }) => external_id)}::text[]))
          `;
        });
        console.log(`${code} ${date}: ${meals.length} menu options, ${meals.filter((meal) => meal.baseKcal !== null).length} with calories, ${meals.filter((meal) => meal.baseProteinG !== null).length} with protein`);
      } catch (error) {
        // Each location has its own transaction so an unavailable page cannot block the other four.
        console.error(`${code} ${date}:`, error instanceof Error ? error.message : "sync failed");
        process.exitCode = 1;
      }
    }
  } finally {
    await sql.end();
  }
}

sync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Cafeteria sync failed.");
  process.exitCode = 1;
});
