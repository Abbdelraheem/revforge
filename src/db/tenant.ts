import { db } from "./index";
import { sql } from "drizzle-orm";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type DbTx = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/**
 * Executes a callback within a database transaction scoped to a specific tenant workspace & user.
 * Sets PostgreSQL session variables for Row-Level Security (RLS) enforcement.
 */
export async function withTenant<T>(
  ctx: { userId: string; workspaceId: string },
  fn: (tx: DbTx) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // Parameterized session configuration
    await tx.execute(
      sql`SELECT set_config('app.user_id', ${ctx.userId}, true), set_config('app.workspace_id', ${ctx.workspaceId}, true)`
    );
    return fn(tx as DbTx);
  });
}
