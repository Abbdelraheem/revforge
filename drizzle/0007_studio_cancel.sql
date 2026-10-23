-- 0007_studio_cancel.sql
-- A cooperative cancellation flag. The worker checks it between phases and
-- releases the full hold instead of settling a partial charge.

ALTER TABLE "studio_edits"
  ADD COLUMN IF NOT EXISTS "cancel_requested" boolean NOT NULL DEFAULT false;
