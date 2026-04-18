import { defineConfig } from "drizzle-kit";
import { env, requireEnv } from "./server/env";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: requireEnv("DATABASE_URL", env.databaseUrl, "DATABASE_URL, ensure the database is provisioned"),
  },
});
