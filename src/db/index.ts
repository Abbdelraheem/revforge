import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/env";

const appConnectionString =
  env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:5432/revforge";
const systemConnectionString =
  env.SYSTEM_DATABASE_URL || appConnectionString;

// App client uses DATABASE_URL (app role, NOBYPASSRLS)
export const client = postgres(appConnectionString, { prepare: false });
// System client uses SYSTEM_DATABASE_URL (system role, BYPASSRLS)
export const systemClient = postgres(systemConnectionString, { prepare: false });

export const db = drizzle(client, { schema });
export const systemDb = drizzle(systemClient, { schema });
