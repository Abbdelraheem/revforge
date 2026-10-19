import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  bigserial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users table (managed with auth + platform role & credits)
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  passwordHash: text("password_hash"),
  platformRole: text("platform_role", {
    enum: ["user", "superadmin"],
  }).default("user").notNull(),
  analysisCreditsUsed: integer("analysis_credits_used").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Workspaces
export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Workspace Members
export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role", {
    enum: ["owner", "admin", "member", "viewer"],
  }).default("member").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Workspace Invites
export const workspaceInvites = pgTable("workspace_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  role: text("role", {
    enum: ["admin", "member", "viewer"],
  }).default("member").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 5. Projects
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", {
    enum: [
      "draft",
      "analyzing",
      "analyzed",
      "analysis_failed",
      "awaiting_payment",
      "paid",
      "queued",
      "building",
      "verifying",
      "delivered",
      "delivered_partial",
      "build_failed",
      "credited",
      "cancelled",
    ],
  }).default("draft").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Targets
export const targets = pgTable("targets", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  kind: text("kind", {
    enum: ["url", "github_repo", "play_store", "app_store", "apk", "pe_binary", "elf_binary", "macho_binary", "asar_package", "har_archive"],
  }).notNull(),
  rawInput: text("raw_input").notNull(),
  normalizedUrl: text("normalized_url"),
  sha256: text("sha256"),
  storageKey: text("storage_key"),
  detectedPlatform: text("detected_platform"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. Attestations (append-only)
export const attestations = pgTable("attestations", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type", {
    enum: ["owner", "written_permission", "interoperability_only"],
  }).notNull(),
  statementVersion: integer("statement_version").default(1).notNull(),
  ipHash: text("ip_hash").notNull(),
  userAgentHash: text("user_agent_hash").notNull(),
  targetSha256: text("target_sha256").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 8. Analyses
export const analyses = pgTable("analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  status: text("status", {
    enum: ["pending", "in_progress", "completed", "failed"],
  }).default("pending").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  modelUsage: jsonb("model_usage").$type<{
    promptTokens: number;
    completionTokens: number;
    totalCostCents: number;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 9. Technical Reports
export const technicalReports = pgTable("technical_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  analysisId: uuid("analysis_id").references(() => analyses.id, { onDelete: "cascade" }).notNull(),
  stack: jsonb("stack").$type<{
    frontend?: { name: string; confidence: number; sourceRef?: string }[];
    backend?: { name: string; confidence: number; sourceRef?: string }[];
    database?: { name: string; confidence: number; sourceRef?: string }[];
    runtime?: string;
  }>().notNull(),
  boundaries: jsonb("boundaries").$type<{
    clientBoundaries: string[];
    apiEndpoints: string[];
    storageInterfaces: string[];
    securityPerimeters: string[];
  }>().notNull(),
  summary: text("summary").notNull(),
  confidence: real("confidence").notNull(),
  schemaVersion: integer("schema_version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 10. Evidence Items
export const evidenceItems = pgTable("evidence_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  reportId: uuid("report_id").references(() => technicalReports.id, { onDelete: "cascade" }).notNull(),
  component: text("component").notNull(),
  category: text("category").notNull(),
  status: text("status", {
    enum: ["seen", "inferred", "unknown_server_side"],
  }).notNull(),
  confidence: real("confidence").notNull(),
  sourceRef: text("source_ref"),
  detail: text("detail").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 11. Features
export const features = pgTable("features", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  reportId: uuid("report_id").references(() => technicalReports.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  class: text("class").notNull(),
  tier: text("tier", {
    enum: ["portfolio", "web_app", "mobile_app", "desktop_binary", "enterprise_saas"],
  }).notNull(),
  estimatedHours: real("estimated_hours").notNull(),
  rationale: text("rationale").notNull(),
  optional: boolean("optional").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 12. Quotes
export const quotes = pgTable("quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  version: integer("version").default(1).notNull(),
  status: text("status", {
    enum: ["draft", "active", "expired", "superseded", "accepted"],
  }).default("active").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  pricingConfigVersion: integer("pricing_config_version").default(1).notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  creditsAppliedCents: integer("credits_applied_cents").default(0).notNull(),
  totalCents: integer("total_cents").notNull(),
  needsReview: boolean("needs_review").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 13. Quote Lines
export const quoteLines = pgTable("quote_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "cascade" }).notNull(),
  featureId: uuid("feature_id").references(() => features.id, { onDelete: "cascade" }).notNull(),
  tier: text("tier", {
    enum: ["portfolio", "web_app", "mobile_app", "desktop_binary", "enterprise_saas"],
  }).notNull(),
  hoursQ4: integer("hours_q4").notNull(),
  hourlyRateCents: integer("hourly_rate_cents").notNull(),
  humanCostCents: integer("human_cost_cents").notNull(),
  platformCents: integer("platform_cents").notNull(),
  selected: boolean("selected").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 14. Orders
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "cascade" }),
  kind: text("kind", {
    enum: ["build", "analysis_fee"],
  }).notNull(),
  status: text("status", {
    enum: [
      "created",
      "awaiting_payment",
      "paid",
      "paid_by_credit",
      "expired",
      "failed",
      "mismatch",
      "refunded",
    ],
  }).default("created").notNull(),
  amountCents: integer("amount_cents").notNull(),
  provider: text("provider", {
    enum: ["paddle", "fake"],
  }).notNull(),
  providerTxnId: text("provider_txn_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 15. Payments
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").default("USD").notNull(),
  provider: text("provider").notNull(),
  providerTxnId: text("provider_txn_id").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 16. Webhook Events (Idempotency)
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull().unique(),
  type: text("type").notNull(),
  payload: text("payload").notNull(),
  status: text("status", {
    enum: ["received", "processed", "failed", "ignored"],
  }).default("received").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

// 17. Credits Ledger (append-only)
export const creditsLedger = pgTable("credits_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  deltaCents: integer("delta_cents").notNull(),
  reason: text("reason").notNull(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  buildJobId: uuid("build_job_id"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 18. Build Jobs
export const buildJobs = pgTable("build_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  status: text("status", {
    enum: ["queued", "building", "verifying", "delivered", "delivered_partial", "build_failed"],
  }).default("queued").notNull(),
  attempt: integer("attempt").default(1).notNull(),
  costCapCents: integer("cost_cap_cents").notNull(),
  spentCents: integer("spent_cents").default(0).notNull(),
  parityScore: real("parity_score"),
  stage: text("stage").default("initializing").notNull(),
  error: text("error"),
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 19. Build Iterations
export const buildIterations = pgTable("build_iterations", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  jobId: uuid("job_id").references(() => buildJobs.id, { onDelete: "cascade" }).notNull(),
  iterationNumber: integer("iteration_number").notNull(),
  parity: jsonb("parity").$type<{
    visual: number;
    structural: number;
    behavioral: number;
    buildHealth: number;
    overall: number;
  }>().notNull(),
  model: text("model").notNull(),
  costCents: integer("cost_cents").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 20. Obligations
export const obligations = pgTable("obligations", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  jobId: uuid("job_id").references(() => buildJobs.id, { onDelete: "cascade" }).notNull(),
  key: text("key").notNull(),
  description: text("description").notNull(),
  acceptanceSpec: jsonb("acceptance_spec").notNull(),
  status: text("status", {
    enum: ["pending", "building", "verified", "failed", "waived"],
  }).default("pending").notNull(),
  ownerAgent: text("owner_agent"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 21. Job Events (BigSerial ID for SSE streaming order)
export const jobEvents = pgTable("job_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  jobId: uuid("job_id").references(() => buildJobs.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 22. Deliveries
export const deliveries = pgTable("deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  jobId: uuid("job_id").references(() => buildJobs.id, { onDelete: "cascade" }).notNull(),
  storageKey: text("storage_key").notNull(),
  sha256: text("sha256").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  status: text("status", {
    enum: ["full", "partial"],
  }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 23. Audit Log (append-only)
export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id"),
  userId: uuid("user_id"),
  actorType: text("actor_type").notNull(), // user, system, worker, admin, webhook
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 24. Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 25. API Keys
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  keyHash: text("key_hash").notNull(),
  prefix: text("prefix").notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 26. Abuse Reports
export const abuseReports = pgTable("abuse_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  targetUrl: text("target_url"),
  projectId: uuid("project_id"),
  reporterEmail: text("reporter_email").notNull(),
  reason: text("reason").notNull(),
  details: text("details").notNull(),
  status: text("status", {
    enum: ["pending", "investigating", "resolved", "dismissed"],
  }).default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 27. Pricing Config (versioned)
export const pricingConfig = pgTable("pricing_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  version: integer("version").notNull().unique(),
  factorBp: integer("factor_bp").default(5000).notNull(), // 0.50 factor
  maxHoursPerFeature: integer("max_hours_per_feature").default(200).notNull(),
  tiers: jsonb("tiers").$type<Record<string, {
    hourlyRateCents: number;
    minFeatureCents: number;
    minOrderCents: number;
  }>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 28. Feature Flags
export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  enabled: boolean("enabled").default(false).notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 29. Outbox (Transaction-bound queue dispatch)
export const outbox = pgTable("outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  topic: text("topic").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
});

// 30. Worker Heartbeats
export const workerHeartbeats = pgTable("worker_heartbeats", {
  id: text("id").primaryKey(), // worker uuid or hostname
  version: text("version").notNull(),
  capacity: integer("capacity").notNull(),
  activeJobs: integer("active_jobs").default(0).notNull(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const workspaceRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  members: many(workspaceMembers),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [projects.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  targets: many(targets),
  attestations: many(attestations),
  analyses: many(analyses),
  quotes: many(quotes),
  orders: many(orders),
  buildJobs: many(buildJobs),
}));
