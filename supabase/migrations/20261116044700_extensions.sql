-- Custom SQL migration file, put your code below! --
-- PostGIS: restaurants.geo + distance search (FR-22).
create extension if not exists postgis with schema extensions;
--> statement-breakpoint
-- moddatetime: keeps updated_at correct for every client (see the triggers migration).
create extension if not exists moddatetime with schema extensions;
