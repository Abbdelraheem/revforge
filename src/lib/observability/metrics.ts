import { systemDb } from "@/db";
import { buildJobs, orders, workerHeartbeats, studioPreviewSessions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface SystemMetrics {
  timestamp: string;
  queueDepth: Record<string, number>;
  jobsTotal: Record<string, number>;
  activeWorkers: number;
  activePreviewSessions: number;
  totalRevenueCents: number;
  totalCostCents: number;
  grossMarginPct: number;
}

/**
 * Gathers system operational metrics from database and active queues.
 */
export async function collectMetrics(): Promise<SystemMetrics> {
  const [jobStats] = await systemDb
    .select({
      queued: sql<number>`count(*) filter (where ${buildJobs.status} = 'queued')::int`,
      building: sql<number>`count(*) filter (where ${buildJobs.status} = 'building')::int`,
      verifying: sql<number>`count(*) filter (where ${buildJobs.status} = 'verifying')::int`,
      delivered: sql<number>`count(*) filter (where ${buildJobs.status} = 'delivered')::int`,
      deliveredPartial: sql<number>`count(*) filter (where ${buildJobs.status} = 'delivered_partial')::int`,
      failed: sql<number>`count(*) filter (where ${buildJobs.status} = 'build_failed')::int`,
      totalSpent: sql<number>`coalesce(sum(${buildJobs.spentCents}), 0)::int`,
    })
    .from(buildJobs);

  const [orderStats] = await systemDb
    .select({
      totalRevenue: sql<number>`coalesce(sum(${orders.amountCents}) filter (where ${orders.status} = 'paid'), 0)::int`,
    })
    .from(orders);

  const [workerCount] = await systemDb
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(workerHeartbeats);

  let activePreviews = 0;
  try {
    const [previewCount] = await systemDb
      .select({
        count: sql<number>`count(*) filter (where ${studioPreviewSessions.status} = 'ready')::int`,
      })
      .from(studioPreviewSessions);
    activePreviews = previewCount?.count ?? 0;
  } catch {}

  const totalRev = orderStats?.totalRevenue ?? 0;
  const totalCost = jobStats?.totalSpent ?? 0;
  const marginPct = totalRev > 0 ? ((totalRev - totalCost) / totalRev) * 100 : 100;

  return {
    timestamp: new Date().toISOString(),
    queueDepth: {
      queued: jobStats?.queued ?? 0,
    },
    jobsTotal: {
      building: jobStats?.building ?? 0,
      verifying: jobStats?.verifying ?? 0,
      delivered: jobStats?.delivered ?? 0,
      delivered_partial: jobStats?.deliveredPartial ?? 0,
      failed: jobStats?.failed ?? 0,
    },
    activeWorkers: workerCount?.count ?? 0,
    activePreviewSessions: activePreviews,
    totalRevenueCents: totalRev,
    totalCostCents: totalCost,
    grossMarginPct: Math.round(marginPct * 10) / 10,
  };
}

/**
 * Formats metrics in standard Prometheus text format.
 */
export function formatPrometheusMetrics(metrics: SystemMetrics): string {
  const lines: string[] = [];

  lines.push("# HELP revforge_queue_depth Current number of queued build jobs");
  lines.push("# TYPE revforge_queue_depth gauge");
  lines.push(`revforge_queue_depth{queue="build"} ${metrics.queueDepth.queued}`);

  lines.push("# HELP revforge_jobs_status Total number of jobs by current status");
  lines.push("# TYPE revforge_jobs_status gauge");
  for (const [status, count] of Object.entries(metrics.jobsTotal)) {
    lines.push(`revforge_jobs_status{status="${status}"} ${count}`);
  }

  lines.push("# HELP revforge_workers_active Current number of reporting worker nodes");
  lines.push("# TYPE revforge_workers_active gauge");
  lines.push(`revforge_workers_active ${metrics.activeWorkers}`);

  lines.push("# HELP revforge_preview_sessions_active Active running Docker container preview sessions");
  lines.push("# TYPE revforge_preview_sessions_active gauge");
  lines.push(`revforge_preview_sessions_active ${metrics.activePreviewSessions}`);

  lines.push("# HELP revforge_revenue_cents_total Total lifetime gross revenue in cents");
  lines.push("# TYPE revforge_revenue_cents_total counter");
  lines.push(`revforge_revenue_cents_total ${metrics.totalRevenueCents}`);

  lines.push("# HELP revforge_provider_cost_cents_total Total lifetime model provider cost in cents");
  lines.push("# TYPE revforge_provider_cost_cents_total counter");
  lines.push(`revforge_provider_cost_cents_total ${metrics.totalCostCents}`);

  lines.push("# HELP revforge_gross_margin_percent Current platform gross margin percentage");
  lines.push("# TYPE revforge_gross_margin_percent gauge");
  lines.push(`revforge_gross_margin_percent ${metrics.grossMarginPct}`);

  return lines.join("\n") + "\n";
}
