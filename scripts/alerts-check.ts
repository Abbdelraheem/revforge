import "dotenv/config";
import { systemDb } from "../src/db";
import { buildJobs, orders, workerHeartbeats, costEvents } from "../src/db/schema";
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

export interface AlertFinding {
  code: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  value?: unknown;
  threshold?: unknown;
}

export interface AlertsReport {
  timestamp: string;
  hasCriticalAlerts: boolean;
  findings: AlertFinding[];
}

export const ALERT_THRESHOLDS = {
  maxFailureRatePct: 20.0,
  maxQueueAgeMinutes: 15,
  maxDailySpendCents: parseInt(process.env.DAILY_SPEND_LIMIT_CENTS || "15000", 10), // $150/day hard budget cap
};

export async function runAlertsCheck(): Promise<AlertsReport> {
  const findings: AlertFinding[] = [];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const queueAgeCutoff = new Date(Date.now() - ALERT_THRESHOLDS.maxQueueAgeMinutes * 60 * 1000);
  const workerCutoff = new Date(Date.now() - 60 * 1000);

  // 1. Worker Heartbeat Check
  try {
    const activeWorkers = await systemDb
      .select()
      .from(workerHeartbeats)
      .where(gte(workerHeartbeats.lastSeen, workerCutoff));

    if (activeWorkers.length === 0) {
      findings.push({
        code: "WORKER_OFFLINE",
        severity: "CRITICAL",
        message: "No active background workers have reported a heartbeat in the last 60 seconds.",
      });
    }
  } catch (err: any) {
    findings.push({
      code: "DB_CONNECTION_ERROR",
      severity: "CRITICAL",
      message: `Failed to query worker heartbeats: ${err.message}`,
    });
  }

  // 2. Queue Age Check (jobs queued too long)
  try {
    const staleQueued = await systemDb
      .select()
      .from(buildJobs)
      .where(
        and(
          eq(buildJobs.status, "queued"),
          lt(buildJobs.createdAt, queueAgeCutoff)
        )
      );

    if (staleQueued.length > 0) {
      findings.push({
        code: "QUEUE_LATENCY_EXCEEDED",
        severity: "CRITICAL",
        message: `${staleQueued.length} job(s) queued longer than ${ALERT_THRESHOLDS.maxQueueAgeMinutes} minutes without being picked up.`,
        value: staleQueued.length,
        threshold: 0,
      });
    }
  } catch {}

  // 3. Job Failure Rate (24h)
  try {
    const [stats] = await systemDb
      .select({
        total: sql<number>`count(*)::int`,
        failed: sql<number>`count(*) filter (where ${buildJobs.status} = 'build_failed')::int`,
      })
      .from(buildJobs)
      .where(gte(buildJobs.createdAt, oneDayAgo));

    if (stats && stats.total >= 5) {
      const failureRate = (stats.failed / stats.total) * 100;
      if (failureRate > ALERT_THRESHOLDS.maxFailureRatePct) {
        findings.push({
          code: "HIGH_JOB_FAILURE_RATE",
          severity: "CRITICAL",
          message: `24h build failure rate is ${failureRate.toFixed(1)}% (${stats.failed}/${stats.total}), exceeding threshold of ${ALERT_THRESHOLDS.maxFailureRatePct}%.`,
          value: failureRate,
          threshold: ALERT_THRESHOLDS.maxFailureRatePct,
        });
      }
    }
  } catch {}

  // 4. Daily Provider Spend Limit Cap
  try {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [costToday] = await systemDb
      .select({
        totalMicros: sql<number>`coalesce(sum(${costEvents.providerCostMicros}), 0)::bigint`,
      })
      .from(costEvents)
      .where(gte(costEvents.createdAt, startOfToday));

    const totalCentsToday = Math.round((costToday?.totalMicros ?? 0) / 1000);
    if (totalCentsToday >= ALERT_THRESHOLDS.maxDailySpendCents) {
      findings.push({
        code: "DAILY_SPEND_BUDGET_EXCEEDED",
        severity: "CRITICAL",
        message: `Anthropic spend today ($${(totalCentsToday / 100).toFixed(2)}) has reached the daily budget cap of $${(ALERT_THRESHOLDS.maxDailySpendCents / 100).toFixed(2)}. New builds must be paused.`,
        value: totalCentsToday,
        threshold: ALERT_THRESHOLDS.maxDailySpendCents,
      });
    }
  } catch {}

  // 5. Negative Margin Jobs
  try {
    const completedJobs = await systemDb
      .select({
        jobId: buildJobs.id,
        spentCents: buildJobs.spentCents,
        orderAmount: orders.amountCents,
      })
      .from(buildJobs)
      .innerJoin(orders, eq(buildJobs.orderId, orders.id))
      .where(gte(buildJobs.createdAt, oneDayAgo));

    const negativeMargin = completedJobs.filter((j) => (j.spentCents || 0) > j.orderAmount);
    if (negativeMargin.length > 0) {
      findings.push({
        code: "NEGATIVE_MARGIN_JOB",
        severity: "WARNING",
        message: `${negativeMargin.length} job(s) in the last 24h incurred provider costs greater than order revenue.`,
        value: negativeMargin.length,
      });
    }
  } catch {}

  const hasCriticalAlerts = findings.some((f) => f.severity === "CRITICAL");

  return {
    timestamp: new Date().toISOString(),
    hasCriticalAlerts,
    findings,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("alerts-check.ts")) {
  runAlertsCheck()
    .then((report) => {
      console.log(`\n=== RevForge Operational Alerts Check: ${report.timestamp} ===`);
      if (report.findings.length === 0) {
        console.log("✓ All operational metrics within normal parameters. 0 active alerts.");
      } else {
        for (const f of report.findings) {
          const prefix = f.severity === "CRITICAL" ? "🔴 [CRITICAL]" : "🟡 [WARNING]";
          console.log(`${prefix} ${f.code}: ${f.message}`);
        }
      }
      console.log("============================================================\n");

      // Exit 0 for cron health, exit 1 if critical issues require paging
      if (report.hasCriticalAlerts) {
        process.exitCode = 1;
      }
    })
    .catch((err) => {
      console.error("Failed to run alerts check:", err);
      process.exit(1);
    });
}
