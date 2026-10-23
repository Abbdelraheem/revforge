-- 0008_delivery_git_archives.sql
-- Generated Git repositories retain the real Studio version history. The
-- source_version_id is metadata only; this table is not a queue.

CREATE TABLE IF NOT EXISTS "delivery_git_archives" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "source_version_id" uuid,
  "storage_key" text NOT NULL,
  "sha256" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "commit_count" integer NOT NULL DEFAULT 0,
  "head_commit" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "delivery_git_archives_project_idx"
  ON "delivery_git_archives" ("workspace_id", "project_id", "created_at" DESC);

ALTER TABLE "delivery_git_archives" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delivery_git_archives" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_git_archives_tenant_policy" ON "delivery_git_archives";
CREATE POLICY "delivery_git_archives_tenant_policy"
  ON "delivery_git_archives"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);
