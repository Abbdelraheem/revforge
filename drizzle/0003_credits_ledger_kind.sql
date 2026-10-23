-- 0003_credits_ledger_kind.sql
-- Brings credits_ledger in line with src/db/schema.ts.
--
-- The schema has exposed `kind` since V5, but no migration ever created it.
-- On a database built only from drizzle/*.sql every hold/settlement insert
-- failed. This migration adds the column, backfills existing rows from their
-- reason/delta, and constrains future values.

ALTER TABLE "credits_ledger"
  ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'adjustment';

-- Backfill rows created before this migration. Historical V5 reasons were
-- free-form, so match both the current `studio_hold:<id>` form and the old
-- human-readable form.
UPDATE "credits_ledger"
SET "kind" = CASE
  WHEN "reason" ILIKE 'studio_hold:%'
    OR "reason" ILIKE 'studio hold%'
    OR "reason" ILIKE 'studio edit hold%'
    THEN 'studio_hold'
  WHEN "reason" ILIKE 'studio_settle:%'
    OR "reason" ILIKE 'studio settle%'
    OR "reason" ILIKE 'studio refund%'
    THEN 'studio_settle'
  WHEN "delta_cents" > 0 THEN 'grant'
  ELSE 'deduction'
END;

ALTER TABLE "credits_ledger"
  ALTER COLUMN "kind" SET DEFAULT 'adjustment',
  ALTER COLUMN "kind" SET NOT NULL;

ALTER TABLE "credits_ledger"
  DROP CONSTRAINT IF EXISTS "credits_ledger_kind_check";

ALTER TABLE "credits_ledger"
  ADD CONSTRAINT "credits_ledger_kind_check"
  CHECK ("kind" IN (
    'grant',
    'deduction',
    'studio_hold',
    'studio_settle',
    'adjustment'
  ));
