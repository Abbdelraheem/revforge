-- Enable and force RLS on all multi-tenant tables
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspaces" FORCE ROW LEVEL SECURITY;

ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_members" FORCE ROW LEVEL SECURITY;

ALTER TABLE "workspace_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_invites" FORCE ROW LEVEL SECURITY;

ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;

ALTER TABLE "targets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "targets" FORCE ROW LEVEL SECURITY;

ALTER TABLE "attestations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attestations" FORCE ROW LEVEL SECURITY;

ALTER TABLE "analyses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analyses" FORCE ROW LEVEL SECURITY;

ALTER TABLE "technical_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "technical_reports" FORCE ROW LEVEL SECURITY;

ALTER TABLE "evidence_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evidence_items" FORCE ROW LEVEL SECURITY;

ALTER TABLE "features" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "features" FORCE ROW LEVEL SECURITY;

ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quotes" FORCE ROW LEVEL SECURITY;

ALTER TABLE "quote_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quote_lines" FORCE ROW LEVEL SECURITY;

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;

ALTER TABLE "credits_ledger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credits_ledger" FORCE ROW LEVEL SECURITY;

ALTER TABLE "build_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "build_jobs" FORCE ROW LEVEL SECURITY;

ALTER TABLE "build_iterations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "build_iterations" FORCE ROW LEVEL SECURITY;

ALTER TABLE "obligations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "obligations" FORCE ROW LEVEL SECURITY;

ALTER TABLE "job_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_events" FORCE ROW LEVEL SECURITY;

ALTER TABLE "deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deliveries" FORCE ROW LEVEL SECURITY;

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;

ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_keys" FORCE ROW LEVEL SECURITY;

-- Tenant Isolation Policies via app.workspace_id session setting
CREATE POLICY workspaces_tenant_policy ON "workspaces"
  USING ("id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY projects_tenant_policy ON "projects"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY targets_tenant_policy ON "targets"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY attestations_tenant_policy ON "attestations"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY analyses_tenant_policy ON "analyses"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY technical_reports_tenant_policy ON "technical_reports"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY evidence_items_tenant_policy ON "evidence_items"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY features_tenant_policy ON "features"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY quotes_tenant_policy ON "quotes"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY quote_lines_tenant_policy ON "quote_lines"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY orders_tenant_policy ON "orders"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY payments_tenant_policy ON "payments"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY credits_ledger_tenant_policy ON "credits_ledger"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY build_jobs_tenant_policy ON "build_jobs"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY build_iterations_tenant_policy ON "build_iterations"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY obligations_tenant_policy ON "obligations"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY job_events_tenant_policy ON "job_events"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY deliveries_tenant_policy ON "deliveries"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY notifications_tenant_policy ON "notifications"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY api_keys_tenant_policy ON "api_keys"
  USING ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK ("workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

-- Append-only enforcement trigger for audit_log
CREATE OR REPLACE FUNCTION audit_log_immutable_trigger()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON "audit_log";
CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON "audit_log"
FOR EACH ROW EXECUTE FUNCTION audit_log_immutable_trigger();
