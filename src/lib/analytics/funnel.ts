import fs from "node:fs";
import path from "node:path";

export type FunnelStage =
  | "visit"
  | "analysis_started"
  | "report_viewed"
  | "quote_generated"
  | "paid"
  | "delivered"
  | "studio_edit"
  | "repurchase";

export interface FunnelEvent {
  id: string;
  stage: FunnelStage;
  anonymousId?: string;
  workspaceId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface FunnelStepMetric {
  stage: FunnelStage;
  label: string;
  count: number;
  conversionFromPreviousPct: number;
  conversionFromFirstPct: number;
}

export interface CohortMetric {
  cohortWeek: string;
  signups: number;
  paidCount: number;
  conversionPct: number;
  repurchaseCount: number;
  repurchasePct: number;
}

const STORAGE_FILE = path.join(process.cwd(), "data", "funnel-events.json");

function ensureStorageDir(): void {
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadEvents(): FunnelEvent[] {
  try {
    ensureStorageDir();
    if (!fs.existsSync(STORAGE_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
    return JSON.parse(raw) as FunnelEvent[];
  } catch {
    return [];
  }
}

function saveEvents(events: FunnelEvent[]): void {
  ensureStorageDir();
  const trimmed = events.slice(-10000);
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
}

export async function recordFunnelEvent(
  stage: FunnelStage,
  options?: {
    anonymousId?: string;
    workspaceId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<FunnelEvent> {
  const events = loadEvents();
  const event: FunnelEvent = {
    id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    stage,
    anonymousId: options?.anonymousId,
    workspaceId: options?.workspaceId,
    timestamp: new Date().toISOString(),
    metadata: options?.metadata,
  };

  events.push(event);
  saveEvents(events);
  return event;
}

const STAGE_ORDER: Array<{ stage: FunnelStage; label: string }> = [
  { stage: "visit", label: "Marketing Visit" },
  { stage: "analysis_started", label: "Analysis Ingestion" },
  { stage: "report_viewed", label: "Technical Report" },
  { stage: "quote_generated", label: "Quote Scoped" },
  { stage: "paid", label: "Build Ordered (Paid)" },
  { stage: "delivered", label: "Verified Delivery" },
  { stage: "studio_edit", label: "Studio Iteration" },
  { stage: "repurchase", label: "Follow-on Build" },
];

export async function getFunnelMetrics(): Promise<FunnelStepMetric[]> {
  const events = loadEvents();
  const counts: Record<FunnelStage, number> = {
    visit: 0,
    analysis_started: 0,
    report_viewed: 0,
    quote_generated: 0,
    paid: 0,
    delivered: 0,
    studio_edit: 0,
    repurchase: 0,
  };

  for (const ev of events) {
    if (counts[ev.stage] !== undefined) {
      counts[ev.stage]++;
    }
  }

  const result: FunnelStepMetric[] = [];
  const firstCount = counts[STAGE_ORDER[0]?.stage ?? "visit"] ?? 0;

  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const item = STAGE_ORDER[i];
    if (!item) continue;
    const { stage, label } = item;
    const count = counts[stage] ?? 0;
    const prevItem = i === 0 ? item : STAGE_ORDER[i - 1];
    const prevCount = prevItem ? (counts[prevItem.stage] ?? 0) : count;

    const conversionFromPreviousPct =
      prevCount > 0 ? Math.round((count / prevCount) * 1000) / 10 : 0;
    const conversionFromFirstPct =
      firstCount > 0 ? Math.round((count / firstCount) * 1000) / 10 : 0;

    result.push({
      stage,
      label,
      count,
      conversionFromPreviousPct,
      conversionFromFirstPct,
    });
  }

  return result;
}

export async function getCohortMetrics(): Promise<CohortMetric[]> {
  const events = loadEvents();
  const cohorts: Record<
    string,
    { signups: Set<string>; paid: Set<string>; repurchases: Set<string> }
  > = {};

  for (const ev of events) {
    const date = new Date(ev.timestamp);
    const startOfWeek = new Date(date);
    startOfWeek.setUTCDate(date.getUTCDate() - date.getUTCDay());
    const weekKey = startOfWeek.toISOString().slice(0, 10);

    if (!cohorts[weekKey]) {
      cohorts[weekKey] = {
        signups: new Set(),
        paid: new Set(),
        repurchases: new Set(),
      };
    }

    const currentCohort = cohorts[weekKey];
    if (!currentCohort) continue;

    const userId = ev.workspaceId || ev.anonymousId;
    if (!userId) continue;

    if (ev.stage === "analysis_started" || ev.stage === "visit") {
      currentCohort.signups.add(userId);
    }
    if (ev.stage === "paid") {
      if (currentCohort.paid.has(userId)) {
        currentCohort.repurchases.add(userId);
      } else {
        currentCohort.paid.add(userId);
      }
    }
  }

  return Object.entries(cohorts)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 8)
    .map(([cohortWeek, data]) => {
      const signups = data.signups.size;
      const paidCount = data.paid.size;
      const repurchaseCount = data.repurchases.size;
      const conversionPct =
        signups > 0 ? Math.round((paidCount / signups) * 1000) / 10 : 0;
      const repurchasePct =
        paidCount > 0 ? Math.round((repurchaseCount / paidCount) * 1000) / 10 : 0;

      return {
        cohortWeek,
        signups,
        paidCount,
        conversionPct,
        repurchaseCount,
        repurchasePct,
      };
    });
}
