-- Custom SQL migration file, put your code below! --

-- Create an empty profile row for every new auth user (FR-01, FR-02).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end; $$;
--> statement-breakpoint
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
--> statement-breakpoint

-- Bump updated_at on every UPDATE, whether it comes from Drizzle or supabase-js.
-- Add a line here for every new table that has an updated_at column.
create trigger set_updated_at before update on public.profiles
  for each row execute function extensions.moddatetime(updated_at);
--> statement-breakpoint
create trigger set_updated_at before update on public.diet_goals
  for each row execute function extensions.moddatetime(updated_at);
--> statement-breakpoint
create trigger set_updated_at before update on public.meal_logs
  for each row execute function extensions.moddatetime(updated_at);
--> statement-breakpoint
create trigger set_updated_at before update on public.weight_logs
  for each row execute function extensions.moddatetime(updated_at);
--> statement-breakpoint
create trigger set_updated_at before update on public.providers
  for each row execute function extensions.moddatetime(updated_at);
--> statement-breakpoint
create trigger set_updated_at before update on public.restaurants
  for each row execute function extensions.moddatetime(updated_at);
--> statement-breakpoint
create trigger set_updated_at before update on public.menu_items
  for each row execute function extensions.moddatetime(updated_at);
--> statement-breakpoint
create trigger set_updated_at before update on public.menu_components
  for each row execute function extensions.moddatetime(updated_at);
--> statement-breakpoint
create trigger set_updated_at before update on public.portion_levels
  for each row execute function extensions.moddatetime(updated_at);
--> statement-breakpoint
create trigger set_updated_at before update on public.orders
  for each row execute function extensions.moddatetime(updated_at);
--> statement-breakpoint
create trigger set_updated_at before update on public.payments
  for each row execute function extensions.moddatetime(updated_at);
--> statement-breakpoint
create trigger set_updated_at before update on public.deliveries
  for each row execute function extensions.moddatetime(updated_at);
