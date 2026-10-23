-- 0004_preview_runtime.sql
-- Adds the preview state machine fields and maps legacy session rows onto the
-- explicit requested -> building -> starting -> ready -> stopping -> stopped
-- lifecycle.

ALTER TABLE "studio_preview_sessions"
  ADD COLUMN IF NOT EXISTS "internal_port" integer,
  ADD COLUMN IF NOT EXISTS "last_error" text,
  ADD COLUMN IF NOT EXISTS "build_logs" text,
  ADD COLUMN IF NOT EXISTS "heartbeat_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "stopped_at" timestamp with time zone;

UPDATE "studio_preview_sessions"
SET "status" = CASE
  WHEN "status" = 'starting' THEN 'starting'
  WHEN "status" = 'running' THEN 'ready'
  WHEN "status" = 'stopped' THEN 'stopped'
  WHEN "status" = 'failed' THEN 'error'
  ELSE "status"
END;

ALTER TABLE "studio_preview_sessions"
  ALTER COLUMN "status" SET DEFAULT 'requested';

CREATE TABLE IF NOT EXISTS "preview_tunnel_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" uuid NOT NULL REFERENCES "studio_preview_sessions"("id") ON DELETE CASCADE,
  "worker_id" text,
  "method" text NOT NULL,
  "path" text NOT NULL,
  "request_headers" jsonb NOT NULL,
  "request_body" text,
  "status" text NOT NULL DEFAULT 'pending',
  "response_status" integer,
  "response_headers" jsonb,
  "response_body" text,
  "error" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "claimed_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "expires_at" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "preview_tunnel_requests_pending_idx"
  ON "preview_tunnel_requests" ("status", "created_at");

