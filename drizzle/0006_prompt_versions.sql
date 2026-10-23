-- 0006_prompt_versions.sql
-- Store the exact static prompt-set version used for each report, build job,
-- and Studio edit so results remain auditable after prompts change.

ALTER TABLE "technical_reports" ADD COLUMN IF NOT EXISTS "prompt_version" text;
ALTER TABLE "build_jobs" ADD COLUMN IF NOT EXISTS "prompt_version" text;
ALTER TABLE "studio_edits" ADD COLUMN IF NOT EXISTS "prompt_version" text;
