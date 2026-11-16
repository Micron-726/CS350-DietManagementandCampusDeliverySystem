import "server-only"; // build error if this file is ever imported from a client component
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
 
// Use the Supabase *pooler* URL (port 6543). Transaction-mode pooling needs prepare: false.
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
 
export const db = drizzle(client, { schema, casing: "snake_case" });
 