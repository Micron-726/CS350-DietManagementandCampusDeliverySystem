-- Custom SQL migration file, put your code below! --

-- Least-privilege access for the Data API roles (NFR-05).
-- Grants decide which operations a role may attempt on a table; RLS policies then decide which
-- rows. The hosted project has "Automatically expose new tables" off (config.toml:
-- auto_expose_new_tables = false), so a new table is unreachable from supabase-js until it is
-- granted here. Result is the same whether auto-expose is on or off, because we revoke first.
--
-- anon (signed out): nothing.
-- The server (Drizzle, postgres role) is unaffected.

revoke all on all tables in schema public from anon, authenticated;
--> statement-breakpoint
revoke all on all sequences in schema public from anon, authenticated;
--> statement-breakpoint

-- Personal data: owner-only rows via RLS.
grant select, insert, update, delete
  on public.diet_goals, public.meal_logs, public.weight_logs, public.meal_searches
  to authenticated;
--> statement-breakpoint
-- The profile row is created by the on_auth_user_created trigger, so no insert/delete.
grant select, update on public.profiles to authenticated;
--> statement-breakpoint

-- Global catalog: read-only. Written by server sync jobs.
grant select
  on public.providers, public.restaurants, public.menu_items, public.menu_components,
     public.portion_levels
  to authenticated;
--> statement-breakpoint

-- Orders: read-only for the owner. Created/updated by the server after the provider responds.
grant select
  on public.orders, public.order_items, public.payments, public.deliveries, public.order_events
  to authenticated;
--> statement-breakpoint

-- integration_logs: no grants (server only).

-- service_role (secret key) keeps full access for admin scripts. It bypasses RLS.
grant all on all tables in schema public to service_role;
--> statement-breakpoint
grant all on all sequences in schema public to service_role;
