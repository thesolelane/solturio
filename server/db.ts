import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";
import { env, requireEnv } from "./env";

neonConfig.webSocketConstructor = ws;

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({
  connectionString: requireEnv(
    "DATABASE_URL",
    env.databaseUrl,
    "DATABASE_URL must be set. Did you forget to provision a database?"
  ),
});
export const db = drizzle({ client: pool, schema });
