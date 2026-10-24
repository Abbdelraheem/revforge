import { systemDb } from "@/db";
import { costEvents, buildJobs, studioEdits, auditLog } from "@/db/schema";
import { eq, and, or, gte, sql } from "drizzle-orm";
import { logger } from "@/lib/observability/logger";

export const DEFAULT_DAILY_SPEND_LIMIT_CENTS = 50000; // $500 / day
export const DEFAULT_MONTHLY_SPEND_LIMIT_CENTS = 1000000; // $10,000 / month
export const MAX_CONCURRENT_BUILDS_PER_WORKSPACE = 2;
export const MAX_DAILY_EDITS_PER_WORKSPACE = 50;
export const MAX_FREE_TRIALS_PER_IP = 1;

export interface BudgetGuardStatus {
  allowed: boolean;
  reason?: string;
  currentSpendCents: number;
  limitCents: number;
  actionRequired?: "pause_queue" | "rate_limit" | "none";
}

export async function checkGlobalDailyBudget(): Promise<BudgetGuardStatus> {
  const limitCents = Number(
    process.env.DAILY_SPEND_LIMIT_CENTS || DEFAULT_DAILY_SPEND_LIMIT_CENTS
  );

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [row] = await systemDb
    .select({
      totalMicros: sql<number>`coalesce(sum(${costEvents.providerCostMicros}), 0)::bigint`,
    })
    .from(costEvents)
    .where(gte(costEvents.createdAt, startOfDay));

  const currentSpendCents = Math.round(Number(row?.totalMicros ?? 0) / 1000);

  if (currentSpendCents >= limitCents) {
    logger.warn({ currentSpendCents, limitCents }, "Global daily spend limit reached. Pausing new builds.");
    return {
      allowed: false,
      reason: `Global daily spend limit of $${(limitCents / 100).toFixed(2)} reached. New builds paused to prevent budget overrun.`,
      currentSpendCents,
      limitCents,
      actionRequired: "pause_queue",
    };
  }

  return {
    allowed: true,
    currentSpendCents,
    limitCents,
    actionRequired: "none",
  };
}

export async function checkWorkspaceConcurrency(
  workspaceId: string
): Promise<{ allowed: boolean; activeCount: number; maxAllowed: number; reason?: string }> {
  const [row] = await systemDb
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(buildJobs)
    .where(
      and(
        eq(buildJobs.workspaceId, workspaceId),
        or(
          eq(buildJobs.status, "queued"),
          eq(buildJobs.status, "building"),
          eq(buildJobs.status, "verifying")
        )
      )
    );

  const activeCount = Number(row?.count ?? 0);

  if (activeCount >= MAX_CONCURRENT_BUILDS_PER_WORKSPACE) {
    return {
      allowed: false,
      activeCount,
      maxAllowed: MAX_CONCURRENT_BUILDS_PER_WORKSPACE,
      reason: `Workspace build concurrency limit (${MAX_CONCURRENT_BUILDS_PER_WORKSPACE}) reached. Please wait for active builds to finish.`,
    };
  }

  return {
    allowed: true,
    activeCount,
    maxAllowed: MAX_CONCURRENT_BUILDS_PER_WORKSPACE,
  };
}

export async function checkWorkspaceDailyEdits(
  workspaceId: string
): Promise<{ allowed: boolean; todayCount: number; maxAllowed: number; reason?: string }> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [row] = await systemDb
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(studioEdits)
    .where(
      and(
        eq(studioEdits.workspaceId, workspaceId),
        gte(studioEdits.createdAt, startOfDay)
      )
    );

  const todayCount = Number(row?.count ?? 0);

  if (todayCount >= MAX_DAILY_EDITS_PER_WORKSPACE) {
    return {
      allowed: false,
      todayCount,
      maxAllowed: MAX_DAILY_EDITS_PER_WORKSPACE,
      reason: `Workspace daily Studio edit limit (${MAX_DAILY_EDITS_PER_WORKSPACE}) reached. Resets at 00:00 UTC.`,
    };
  }

  return {
    allowed: true,
    todayCount,
    maxAllowed: MAX_DAILY_EDITS_PER_WORKSPACE,
  };
}

const trialIpTracker = new Map<string, number>();

export function checkIpFreeTrialUsage(ipAddress: string): {
  allowed: boolean;
  timesUsed: number;
  reason?: string;
} {
  const cleanIp = ipAddress.trim();
  const timesUsed = trialIpTracker.get(cleanIp) || 0;

  if (timesUsed >= MAX_FREE_TRIALS_PER_IP) {
    return {
      allowed: false,
      timesUsed,
      reason: "Complimentary architectural analysis already claimed from this IP address.",
    };
  }

  return {
    allowed: true,
    timesUsed,
  };
}

export function recordIpFreeTrial(ipAddress: string): void {
  const cleanIp = ipAddress.trim();
  const current = trialIpTracker.get(cleanIp) || 0;
  trialIpTracker.set(cleanIp, current + 1);
}
