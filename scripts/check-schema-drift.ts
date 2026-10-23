import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as schema from "../src/db/schema";

interface ExpectedColumn {
  name: string;
  notNull: boolean;
  hasDefault: boolean;
  defaultSql: string | null;
}

interface ExpectedTable {
  name: string;
  columns: Map<string, ExpectedColumn>;
}

interface ActualColumn {
  table_name: string;
  column_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRIZZLE_DIR = path.join(ROOT, "drizzle");

const REQUIRE_DB =
  process.argv.includes("--require-db") ||
  process.env.REQUIRE_SCHEMA_DRIFT === "1";

function normalizeDefault(raw: string): string {
  let value = raw.trim().toLowerCase();
  value = value.replace(/^\((.*)\)$/s, "$1").trim();
  value = value.replace(/::[a-z0-9_ "[\].]+$/g, "").trim();
  value = value.replace(/^'(.*)'$/s, "$1").replace(/''/g, "'").trim();
  if (value === "current_timestamp") value = "now()";
  if (value.startsWith("nextval(")) value = "nextval";
  return value.replace(/\s+/g, " ");
}

function extractExpectedDefault(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return normalizeDefault(String(value));
  }

  if (typeof value === "object") {
    const queryChunks = (value as { queryChunks?: unknown[] }).queryChunks;
    if (Array.isArray(queryChunks)) {
      const parts: string[] = [];
      for (const chunk of queryChunks) {
        if (chunk === undefined || chunk === null) continue;
        if (typeof chunk === "string") {
          parts.push(chunk);
          continue;
        }
        const chunkValue = (chunk as { value?: unknown }).value;
        if (Array.isArray(chunkValue)) {
          parts.push(chunkValue.join(""));
        } else if (typeof chunkValue === "string") {
          parts.push(chunkValue);
        } else {
          parts.push(String(chunk));
        }
      }
      return normalizeDefault(parts.join(""));
    }
  }

  return null;
}

function expectedSchema(): Map<string, ExpectedTable> {
  const tables = new Map<string, ExpectedTable>();

  for (const value of Object.values(schema)) {
    if (!is(value, PgTable)) continue;
    const config = getTableConfig(value as PgTable);
    const columns = new Map<string, ExpectedColumn>();

    for (const column of config.columns as Array<{
      name: string;
      notNull: boolean;
      hasDefault: boolean;
      default?: unknown;
    }>) {
      columns.set(column.name, {
        name: column.name,
        notNull: Boolean(column.notNull),
        hasDefault: Boolean(column.hasDefault),
        defaultSql: extractExpectedDefault(column.default),
      });
    }

    tables.set(config.name, { name: config.name, columns });
  }

  return tables;
}

function databaseUrlWithName(connectionString: string, name: string): string {
  const url = new URL(connectionString);
  url.pathname = `/${name}`;
  return url.toString();
}

function temporaryDatabaseName(): string {
  return `revforge_drift_${process.pid}_${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 63);
}

async function migrationFiles(): Promise<string[]> {
  const entries = await fs.readdir(DRIZZLE_DIR);
  return entries.filter((entry) => entry.endsWith(".sql")).sort();
}

function compare(
  expected: Map<string, ExpectedTable>,
  actualRows: ActualColumn[]
): string[] {
  const problems: string[] = [];
  const actualTables = new Map<string, Map<string, ActualColumn>>();

  for (const row of actualRows) {
    let columns = actualTables.get(row.table_name);
    if (!columns) {
      columns = new Map();
      actualTables.set(row.table_name, columns);
    }
    columns.set(row.column_name, row);
  }

  const ignoredTables = new Set(["_drizzle_migrations", "drizzle_migrations"]);

  for (const [tableName, table] of expected) {
    const actualColumns = actualTables.get(tableName);
    if (!actualColumns) {
      problems.push(`missing table: ${tableName}`);
      continue;
    }

    for (const [columnName, column] of table.columns) {
      const actual = actualColumns.get(columnName);
      if (!actual) {
        problems.push(`missing column: ${tableName}.${columnName}`);
        continue;
      }

      const actualNotNull = actual.is_nullable === "NO";
      if (column.notNull !== actualNotNull) {
        problems.push(
          `nullability mismatch: ${tableName}.${columnName} (schema ${
            column.notNull ? "NOT NULL" : "NULL"
          }, migrations ${actualNotNull ? "NOT NULL" : "NULL"})`
        );
      }

      const actualHasDefault = actual.column_default !== null;
      if (column.hasDefault !== actualHasDefault) {
        problems.push(
          `default presence mismatch: ${tableName}.${columnName} (schema ${
            column.hasDefault ? "has default" : "no default"
          }, migrations ${actualHasDefault ? "has default" : "no default"})`
        );
      }

      if (column.hasDefault && actualHasDefault) {
        const actualDefault = normalizeDefault(actual.column_default || "");
        if (
          column.defaultSql !== null &&
          actualDefault.length > 0 &&
          column.defaultSql !== actualDefault
        ) {
          problems.push(
            `default mismatch: ${tableName}.${columnName} (schema "${column.defaultSql}", migrations "${actualDefault}")`
          );
        }
      }
    }

    for (const columnName of actualColumns.keys()) {
      if (!table.columns.has(columnName)) {
        problems.push(`extra column in migrations: ${tableName}.${columnName}`);
      }
    }
  }

  for (const tableName of actualTables.keys()) {
    if (!expected.has(tableName) && !ignoredTables.has(tableName)) {
      problems.push(`extra table in migrations: ${tableName}`);
    }
  }

  return problems;
}

async function main(): Promise<void> {
  const connectionString =
    process.env.SCHEMA_DRIFT_DATABASE_URL ||
    process.env.SYSTEM_DATABASE_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    const message =
      "DATABASE_URL/SYSTEM_DATABASE_URL is not set; cannot create a fresh database.";
    if (REQUIRE_DB) {
      console.error(`[schema-drift] FAIL: ${message}`);
      process.exit(1);
    }
    console.warn(`[schema-drift] SKIPPED: ${message}`);
    return;
  }

  const adminUrl = databaseUrlWithName(connectionString, "postgres");
  const admin = postgres(adminUrl, {
    max: 1,
    connect_timeout: 5,
    onnotice: () => {},
  });

  try {
    await admin`SELECT 1`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (REQUIRE_DB) {
      console.error(`[schema-drift] FAIL: cannot reach Postgres: ${message}`);
      await admin.end({ timeout: 5 }).catch(() => {});
      process.exit(1);
    }
    console.warn(
      `[schema-drift] SKIPPED: cannot reach Postgres (${message}). Set --require-db or REQUIRE_SCHEMA_DRIFT=1 to make this fatal.`
    );
    await admin.end({ timeout: 5 }).catch(() => {});
    return;
  }

  const databaseName = temporaryDatabaseName();
  let temp: ReturnType<typeof postgres> | null = null;

  try {
    await admin.unsafe(`CREATE DATABASE "${databaseName}"`);

    temp = postgres(databaseUrlWithName(connectionString, databaseName), {
      max: 1,
      connect_timeout: 10,
      onnotice: () => {},
    });

    const files = await migrationFiles();
    for (const file of files) {
      const contents = await fs.readFile(path.join(DRIZZLE_DIR, file), "utf8");
      await temp.unsafe(contents).simple();
    }

    const rows = (await temp`
      SELECT table_name, column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `) as unknown as ActualColumn[];

    const expected = expectedSchema();
    const problems = compare(expected, rows);
    const columnCount = Array.from(expected.values()).reduce(
      (total, table) => total + table.columns.size,
      0
    );

    if (problems.length > 0) {
      console.error(
        `[schema-drift] FAIL: ${problems.length} mismatch(es) between src/db/schema.ts and drizzle/*.sql`
      );
      for (const problem of problems) console.error(`  - ${problem}`);
      process.exitCode = 1;
      return;
    }

    console.log(
      `[schema-drift] OK: ${expected.size} tables / ${columnCount} columns match ${files.length} migration files (${files.join(", ")}).`
    );
  } finally {
    if (temp) await temp.end({ timeout: 5 }).catch(() => {});
    await admin
      .unsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
      .catch(() => {});
    await admin.end({ timeout: 5 }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(
    `[schema-drift] FAIL: ${error instanceof Error ? error.stack || error.message : String(error)}`
  );
  process.exit(1);
});
