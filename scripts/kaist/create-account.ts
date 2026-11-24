import { cafeteriaCodes, providerCode } from "./cafeteria";
import { openDatabase } from "./database";

async function createAccount() {
  const email = process.env.CAFETERIA_ACCOUNT_EMAIL?.trim().toLowerCase();
  const password = process.env.CAFETERIA_ACCOUNT_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set CAFETERIA_ACCOUNT_EMAIL to the store login email.");

  const sql = openDatabase();
  try {
    await sql.begin(async (tx) => {
      const cafeterias = await tx<{ id: string; owner_id: string | null }[]>`
        select restaurant.id, restaurant.owner_id from public.restaurants restaurant
        join public.providers provider on provider.id = restaurant.provider_id
        where provider.code = ${providerCode} and restaurant.external_id in ${tx(cafeteriaCodes)}
        order by restaurant.id for update of restaurant
      `;
      if (cafeterias.length !== cafeteriaCodes.length) throw new Error("Apply the KAIST cafeteria migrations first.");

      const [account] = await tx<{ id: string; role: string }[]>`
        select profile.id, profile.role
        from auth.users as account join public.profiles profile on profile.id = account.id
        where lower(account.email) = ${email}
      `;
      if (account && account.role !== "restaurant") throw new Error("That email already belongs to a customer account.");
      if (cafeterias.some(({ owner_id }) => owner_id && owner_id !== account?.id)) {
        throw new Error("A cafeteria is already managed by a different account.");
      }

      let accountId = account?.id;
      if (!accountId) {
        if (!password || password.length < 6) throw new Error("Set CAFETERIA_ACCOUNT_PASSWORD to a password with at least six characters.");
        const [created] = await tx<{ id: string }[]>`
          select public.admin_create_account(${email}, ${password}, 'restaurant', 'KAIST 학식') as id
        `;
        accountId = created.id;
      }
      await tx`update public.restaurants set owner_id = ${accountId} where id in ${tx(cafeterias.map(({ id }) => id))}`;
    });
    console.log(`Linked the KAIST cafeteria store account to ${cafeteriaCodes.length} locations.`);
  } finally {
    await sql.end();
  }
}

createAccount().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to provision the cafeteria account.");
  process.exitCode = 1;
});
