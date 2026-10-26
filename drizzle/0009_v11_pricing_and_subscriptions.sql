-- 0009_v11_pricing_and_subscriptions.sql
-- V11 schema additions: model profile tracking, admin pricing tiers with scope caps,
-- tier cost statistics for floor guards, recurring subscriptions, and discount coupons.

ALTER TABLE "cost_events"
  ADD COLUMN IF NOT EXISTS "model_profile" text NOT NULL DEFAULT 'launch',
  ADD COLUMN IF NOT EXISTS "cache_creation_input_tokens" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cache_read_input_tokens" integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "pricing_tiers" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "price_cents" integer NOT NULL,
  "max_screens" integer NOT NULL,
  "max_entities" integer NOT NULL,
  "max_integrations" integer NOT NULL,
  "max_hours" integer NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tier_cost_stats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tier" text NOT NULL,
  "model_profile" text NOT NULL DEFAULT 'launch',
  "p50_cost_cents" integer NOT NULL,
  "p90_cost_cents" integer NOT NULL,
  "sample_count" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "paddle_subscription_id" text UNIQUE,
  "paddle_customer_id" text,
  "plan_id" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "current_period_start" timestamp with time zone NOT NULL,
  "current_period_end" timestamp with time zone NOT NULL,
  "cancel_at_period_end" boolean NOT NULL DEFAULT false,
  "monthly_credits_cents" integer NOT NULL,
  "rollover_cap_cents" integer NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "subscription_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "subscription_id" uuid NOT NULL REFERENCES "subscriptions"("id") ON DELETE CASCADE,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "paddle_event_id" text UNIQUE,
  "payload" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "coupons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "discount_pct" integer NOT NULL,
  "max_uses" integer,
  "used_count" integer NOT NULL DEFAULT 0,
  "expires_at" timestamp with time zone,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "tier_cost_stats_tier_profile_idx"
  ON "tier_cost_stats" ("tier", "model_profile");

CREATE INDEX IF NOT EXISTS "subscriptions_workspace_idx"
  ON "subscriptions" ("workspace_id", "status");

CREATE INDEX IF NOT EXISTS "subscription_events_sub_idx"
  ON "subscription_events" ("subscription_id", "created_at" DESC);

-- Enable & enforce RLS
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;

ALTER TABLE "subscription_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription_events" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_tenant_policy" ON "subscriptions";
CREATE POLICY "subscriptions_tenant_policy"
  ON "subscriptions"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

DROP POLICY IF EXISTS "subscription_events_tenant_policy" ON "subscription_events";
CREATE POLICY "subscription_events_tenant_policy"
  ON "subscription_events"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

-- Seed initial pricing tiers
INSERT INTO "pricing_tiers" ("id", "name", "price_cents", "max_screens", "max_entities", "max_integrations", "max_hours")
VALUES
  ('portfolio', 'Landing / Portfolio', 3900, 3, 2, 1, 12),
  ('web_app', 'Web App', 7900, 8, 6, 3, 24),
  ('mobile_app', 'Mobile Binary', 14900, 20, 15, 5, 48),
  ('desktop_binary', 'Desktop Binary', 24900, 35, 25, 8, 80),
  ('enterprise_saas', 'Full SaaS', 39900, 50, 40, 15, 160)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "price_cents" = EXCLUDED."price_cents",
  "max_screens" = EXCLUDED."max_screens",
  "max_entities" = EXCLUDED."max_entities",
  "max_integrations" = EXCLUDED."max_integrations",
  "max_hours" = EXCLUDED."max_hours",
  "updated_at" = now();

-- Seed initial LAUNCH20 coupon
INSERT INTO "coupons" ("code", "discount_pct", "max_uses", "active")
VALUES ('LAUNCH20', 20, 500, true)
ON CONFLICT ("code") DO NOTHING;
