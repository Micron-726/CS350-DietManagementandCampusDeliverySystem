import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

export function openDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL for the cafeteria database.");
  return postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
}
