import { pgTable, uuid, text, timestamp, boolean, integer, real, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  targetType: text("target_type", {
    enum: ["portfolio", "web_app", "mobile_app", "desktop_binary", "enterprise_saas"],
  }).notNull(),
  targetSource: text("target_source", {
    enum: ["url", "file"],
  }).notNull(),
  targetInput: text("target_input").notNull(),
  status: text("status", {
    enum: ["pending_triage", "triaged", "payment_pending", "rebuilding", "completed", "failed"],
  }).default("pending_triage").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const artifacts = pgTable("artifacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  storageKey: text("storage_key").notNull(),
  originalFilename: text("original_filename").notNull(),
  sanitizedFilename: text("sanitized_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  magicBytesVerified: boolean("magic_bytes_verified").default(false).notNull(),
  sha256Hash: text("sha256_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const technicalReports = pgTable("technical_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  detectedTechStack: jsonb("detected_tech_stack").$type<{
    frontend?: string[];
    backend?: string[];
    database?: string[];
    libraries?: string[];
    runtime?: string;
  }>().notNull(),
  architectureBoundaries: jsonb("architecture_boundaries").$type<{
    clientBoundaries: string[];
    apiEndpoints: string[];
    storageInterfaces: string[];
    securityPerimeters: string[];
  }>().notNull(),
  evidenceLedger: jsonb("evidence_ledger").$type<{
    seen: Array<{ component: string; evidence: string }>;
    inferred: Array<{ component: string; rationale: string }>;
    unknownServerSide: Array<{ component: string; reconstructionObligation: string }>;
  }>().notNull(),
  rawSummary: text("raw_summary").notNull(),
  triageConfidence: real("triage_confidence").default(0.95).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const itemizedFeatureQuotes = pgTable("itemized_feature_quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  featureName: text("feature_name").notNull(),
  featureCategory: text("feature_category").notNull(),
  complexityTier: text("complexity_tier", {
    enum: ["portfolio", "web_app", "mobile_app", "desktop_binary", "enterprise_saas"],
  }).notNull(),
  estimatedHours: real("estimated_hours").notNull(),
  marketHourlyRateUsd: real("market_hourly_rate_usd").notNull(),
  // Formula: (estimatedHours * marketHourlyRateUsd) * 0.5
  platformPriceUsd: real("platform_price_usd").notNull(),
  isSelected: boolean("is_selected").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  paddleTransactionId: text("paddle_transaction_id").unique().notNull(),
  paddleCustomerId: text("paddle_customer_id"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").default("usd").notNull(),
  status: text("status", {
    enum: ["pending", "succeeded", "failed"],
  }).default("pending").notNull(),
  verifiedWebhookAt: timestamp("verified_webhook_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sandboxJobs = pgTable("sandbox_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  jobType: text("job_type").default("clean_room_rebuild").notNull(),
  status: text("status", {
    enum: ["queued", "running", "completed", "failed"],
  }).default("queued").notNull(),
  containerId: text("container_id"),
  currentStep: text("current_step").default("initializing").notNull(),
  progressPercent: integer("progress_percent").default(0).notNull(),
  logs: jsonb("logs").$type<Array<{ timestamp: string; step: string; message: string }>>().default([]).notNull(),
  resultRepositoryUrl: text("result_repository_url"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  artifacts: many(artifacts),
  report: one(technicalReports, { fields: [projects.id], references: [technicalReports.projectId] }),
  featureQuotes: many(itemizedFeatureQuotes),
  payment: one(payments, { fields: [projects.id], references: [payments.projectId] }),
  sandboxJob: one(sandboxJobs, { fields: [projects.id], references: [sandboxJobs.projectId] }),
}));
