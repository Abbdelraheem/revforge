-- 0002_studio_schema_and_rls.sql
-- Creates studio_edits, studio_versions, studio_preview_sessions and enforces RLS

CREATE TABLE IF NOT EXISTS "studio_edits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "parent_version_id" uuid,
  "resulting_version_id" uuid,
  "prompt_raw" text NOT NULL,
  "prompt_enhanced" text,
  "status" text NOT NULL DEFAULT 'pending',
  "tokens_held_cents" integer NOT NULL DEFAULT 0,
  "tokens_settled_cents" integer NOT NULL DEFAULT 0,
  "diff_stat" jsonb,
  "failure_reason" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "finished_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "studio_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "parent_version_id" uuid,
  "version_number" integer NOT NULL,
  "label" text NOT NULL,
  "zip_storage_key" text NOT NULL,
  "preview_url" text,
  "parity_score" real,
  "files_manifest" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "studio_preview_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "version_id" uuid NOT NULL REFERENCES "studio_versions"("id") ON DELETE CASCADE,
  "container_id" text,
  "port" integer,
  "status" text NOT NULL DEFAULT 'starting',
  "auth_token" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable and force RLS on the Studio tables
ALTER TABLE "studio_edits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio_edits" FORCE ROW LEVEL SECURITY;

ALTER TABLE "studio_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio_versions" FORCE ROW LEVEL SECURITY;

ALTER TABLE "studio_preview_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio_preview_sessions" FORCE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY studio_edits_tenant_policy ON "studio_edits"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY studio_versions_tenant_policy ON "studio_versions"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY studio_preview_sessions_tenant_policy ON "studio_preview_sessions"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);
