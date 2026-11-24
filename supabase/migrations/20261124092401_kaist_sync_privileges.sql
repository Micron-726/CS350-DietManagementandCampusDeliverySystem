-- The scheduled job uses a dedicated login with this role. Keep customer and order data
-- outside its grants, and limit catalog writes to date-specific KAIST imports.
do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'kaist_cafeteria_sync') then
    create role kaist_cafeteria_sync nologin;
  end if;
end $$;
--> statement-breakpoint
grant usage on schema public to kaist_cafeteria_sync;
grant select (id, code) on public.providers to kaist_cafeteria_sync;
grant select (id, provider_id, external_id) on public.restaurants to kaist_cafeteria_sync;
grant select on public.menu_items to kaist_cafeteria_sync;
grant insert (restaurant_id, external_id, name, description, category, base_price_krw, base_kcal, kcal_source,
  base_protein_g, protein_source, extra_nutrition, service_date, source_url, last_synced_at, is_available)
  on public.menu_items to kaist_cafeteria_sync;
grant update (name, description, category, base_price_krw, base_kcal, kcal_source, base_protein_g,
  protein_source, extra_nutrition, last_synced_at, is_available) on public.menu_items to kaist_cafeteria_sync;
--> statement-breakpoint
create policy "providers_kaist_sync" on public.providers for select to kaist_cafeteria_sync
  using (code = 'kaist_cafeteria');
create policy "restaurants_kaist_sync" on public.restaurants for select to kaist_cafeteria_sync
  using (exists (select 1 from public.providers where id = provider_id and code = 'kaist_cafeteria'));
create policy "menu_items_kaist_sync" on public.menu_items to kaist_cafeteria_sync
  using (
    service_date is not null and source_url like 'https://www.kaist.ac.kr/kr/html/campus/053001.html?%'
    and exists (select 1 from public.restaurants join public.providers on providers.id = restaurants.provider_id
                where restaurants.id = restaurant_id and providers.code = 'kaist_cafeteria')
  );
