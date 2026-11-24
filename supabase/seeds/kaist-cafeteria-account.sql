-- Local demo login. For a shared database, provision a team-chosen email and private
-- password with npm run cafeteria:account after applying the migrations.
with account as (
  select public.admin_create_account('kaist-cafeteria@example.com', 'demo-cafeteria', 'restaurant', 'KAIST 학식') as id
)
update public.restaurants as restaurant
set owner_id = account.id
from public.providers provider, account
where restaurant.provider_id = provider.id and provider.code = 'kaist_cafeteria';
