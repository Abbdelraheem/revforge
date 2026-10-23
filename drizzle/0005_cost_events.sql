-- 0005_cost_events.sql
-- Append-only provider cost ledger. This table is RLS-exempt like audit_events
-- because the worker and admin margin views must add costs from every tenant.

CREATE TABLE IF NOT EXISTS "cost_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "source" text NOT NULL,
  "ref_id" text,
  "model" text,
  "input_tokens" integer NOT NULL DEFAULT 0,
  "output_tokens" integer NOT NULL DEFAULT 0,
  "provider_cost_cents" integer NOT NULL DEFAULT 0,
  "provider_cost_micros" bigint NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "cost_events_project_created_idx"
  ON "cost_events" ("project_id", "created_at");

CREATE INDEX IF NOT EXISTS "cost_events_workspace_created_idx"
  ON "cost_events" ("workspace_id", "created_at");

-- Insert-only for the application role. Updates/deletes are not granted.
REVOKE UPDATE, DELETE ON "cost_events" FROM PUBLIC;
