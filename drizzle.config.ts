import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });
 
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./supabase/migrations", // Supabase CLI picks these up
  migrations: { prefix: "supabase" }, // timestamped file names, as the Supabase CLI expects
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ["public"],
  entities: { roles: { provider: "supabase" } }, // don't try to create/drop Supabase's built-in roles
  extensionsFilters: ["postgis"], // ignore PostGIS's own tables when introspecting
});
 