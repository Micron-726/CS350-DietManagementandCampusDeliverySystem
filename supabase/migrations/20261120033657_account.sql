-- Custom SQL migration file, put your code below! --

-- Accounts (FR-01, NFR-05, NFR-07).
--
-- Two account types, stored in profiles.role:
--   customer   = KAIST member. Self sign-up, @kaist.ac.kr email only (fake KAIST auth: the domain
--                is checked, no mail is sent).
--   restaurant = store account. There is no self sign-up for stores: an admin creates the auth user
--                with app_metadata {"role": "restaurant"} (Studio, SQL or auth.admin.createUser).
--
-- The role is read from raw_app_meta_data, NOT raw_user_meta_data: a client can put anything in
-- user_metadata through supabase.auth.signUp(), but only an admin can set app_metadata. So a
-- client-side sign-up is always a customer, and always needs an @kaist.ac.kr address, even when
-- it bypasses the app and calls supabase-js directly.

-- Replaces the version from the triggers migration (same trigger, new body).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role public.account_role :=
    case when new.raw_app_meta_data->>'role' = 'restaurant' then 'restaurant' else 'customer' end;
begin
  if v_role = 'customer' and lower(coalesce(new.email, '')) !~ '^[^@\s]+@kaist\.ac\.kr$' then
    raise exception 'Only @kaist.ac.kr email addresses can sign up'
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, role, display_name)
  values (new.id, v_role, nullif(btrim(new.raw_user_meta_data->>'display_name'), ''));
  return new;
end; $$;
--> statement-breakpoint

-- A customer can't later move their account to a non-KAIST address (auth.updateUser({ email })).
create or replace function public.check_customer_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if lower(coalesce(new.email, '')) !~ '^[^@\s]+@kaist\.ac\.kr$'
     and exists (select 1 from public.profiles p where p.id = new.id and p.role = 'customer') then
    raise exception 'Customer accounts must keep an @kaist.ac.kr email address'
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;
--> statement-breakpoint
create trigger on_auth_user_email_change
  before update of email on auth.users
  for each row when (new.email is distinct from old.email)
  execute function public.check_customer_email();
--> statement-breakpoint

-- Admin helper: create a confirmed email/password account, e.g. for a store that applied by mail.
-- Run in the SQL editor (Studio / psql). Not callable from supabase-js (execute revoked below).
--   select public.admin_create_account('store@example.com', 'password', 'restaurant', 'Store name',
--                                      '<restaurants.id to link, or null>');
-- Passwords are not length-checked here; use 6+ characters for real accounts.
create or replace function public.admin_create_account(
  p_email text,
  p_password text,
  p_role public.account_role,
  p_display_name text default null,
  p_restaurant_id uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(btrim(p_email));
begin
  if p_role = 'customer' and p_restaurant_id is not null then
    raise exception 'Only restaurant accounts can own a restaurant';
  end if;

  -- The token columns must be '' rather than NULL, or Auth fails to load the user.
  insert into auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
     raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
     confirmation_token, recovery_token, email_change, email_change_token_new)
  values
    ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
     extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
     jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', p_role),
     case when p_display_name is null then '{}'::jsonb
          else jsonb_build_object('display_name', p_display_name) end,
     now(), now(), '', '', '', '');
  -- ↑ on_auth_user_created creates the profile (and rejects a non-KAIST customer email).

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text, 'email',
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
          now(), now(), now());

  if p_restaurant_id is not null then
    update public.restaurants set owner_id = v_id where id = p_restaurant_id;
    if not found then
      raise exception 'Restaurant % not found', p_restaurant_id;
    end if;
  end if;

  return v_id;
end; $$;
--> statement-breakpoint
-- Functions in public are executable by everyone by default, which would expose this one as an RPC.
revoke execute on function public.admin_create_account(text, text, public.account_role, text, uuid)
  from public, anon, authenticated;
--> statement-breakpoint

-- Users must not change their own role. Replace the table-wide UPDATE grant from the grants
-- migration with a column list that leaves out id, role, created_at and updated_at
-- (updated_at is still bumped by the set_updated_at trigger).
-- !! When you add a user-editable column to profiles, add it to this list in a new migration.
revoke update on public.profiles from authenticated;
--> statement-breakpoint
grant update (
  display_name, height_cm, weight_kg, age, sex, activity_level, unit_prefs, timezone,
  default_location_label, default_lat, default_lng
) on public.profiles to authenticated;
