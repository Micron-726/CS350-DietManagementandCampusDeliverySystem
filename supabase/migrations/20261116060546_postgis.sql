-- Custom SQL migration file, put your code below! --

-- restaurants.geo: PostGIS point derived from lat/lng, for distance search (FR-22).
-- Kept out of the Drizzle schema because drizzle-kit can't emit a schema-qualified custom type.
-- Every PostGIS reference is qualified with `extensions.`: the hosted migration session does not
-- have `extensions` on its search_path, so unqualified `geography` / `st_*` fail there.
alter table public.restaurants
  add column geo extensions.geography(Point, 4326)
  generated always as (
    extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography(Point, 4326)
  ) stored;
--> statement-breakpoint
create index restaurants_geo_gist on public.restaurants using gist (geo);
