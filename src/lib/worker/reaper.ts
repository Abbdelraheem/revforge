import { systemDb } from "@/db";
import { buildJobs, orders, workerHeartbeats } from "@/db/schema";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { issueCredits } from "@/lib/billing/credits";
import { buildQueue } from "@/lib/queue/queues";

export interface ReaperOptions {
  leaseTimeoutMs?: number; // Time without heartbeat before considering lease expired (default: 10 min)
  maxAttempts?: number; // Max recovery attempts before failing and refunding (default: 3)
}

export interface ReapedJobReport {
  jobId: string;
  projectId: string;
  workspaceId: string;
  previousStatus: string;
  action: "resumed" | "refunded_and_failed";
  refundAmountCents?: number;
  reason: string;
}

export interface ReaperSummary {
  timestamp: string;
  reapedJobs: ReapedJobReport[];
  offlineWorkers: string[];
}

/**
 * Stuck-Job Reaper:
 * Inspects all active build jobs with expired leases or abandoned worker loops.
 * Resumes jobs from last checkpoint if under max attempts, or fails, alerts,
 * and automatically refunds platform credits to the client if poison/exhausted.
 */
export async function reapStuckJobs(
  options: ReaperOptions = {}
): Promise<ReaperSummary> {
  const leaseTimeoutMs = options.leaseTimeoutMs ?? 10 * 60 * 1000;
  const maxAttempts = options.maxAttempts ?? 3;
  const cutoff = new Date(Date.now() - leaseTimeoutMs);

  const reapedJobs: ReapedJobReport[] = [];
  const offlineWorkers: string[] = [];

  // 1. Find jobs stuck in non-terminal states with stale heartbeat or stale update
  const stuckCandidates = await systemDb
    .select()
    .from(buildJobs)
    .where(
      and(
        inArray(buildJobs.status, ["building", "verifying"]),
        lt(buildJobs.updatedAt, cutoff)
      )
    );

  for (const job of stuckCandidates) {
    if (job.attempt < maxAttempts) {
      // Resume job: increment attempt and re-enqueue
      const nextAttempt = job.attempt + 1;
      await systemDb
        .update(buildJobs)
        .set({
          status: "queued",
          stage: "resumed_from_checkpoint",
          attempt: nextAttempt,
          heartbeatAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(buildJobs.id, job.id));

      await buildQueue.add("resume-build", {
        jobId: job.id,
        projectId: job.projectId,
      });

      reapedJobs.push({
        jobId: job.id,
        projectId: job.projectId,
        workspaceId: job.workspaceId,
        previousStatus: job.status,
        action: "resumed",
        reason: `Worker heartbeat lost for >${Math.round(leaseTimeoutMs / 60000)}m. Resuming attempt ${nextAttempt}/${maxAttempts}.`,
      });
    } else {
      // Exceeded attempts: poison job -> terminal fail + automatic credit refund
      let refundAmountCents = 0;
      const [order] = await systemDb
        .select()
        .from(orders)
        .where(eq(orders.id, job.orderId));

      if (order && order.amountCents > 0) {
        refundAmountCents = order.amountCents;
        try {
          await issueCredits({
            workspaceId: job.workspaceId,
            amountCents: refundAmountCents,
            reason: `Platform reliability refund: build job ${job.id} exceeded retry limits without clean delivery`,
          });
        } catch (err) {
          console.error(`[Reaper] Failed to issue credit refund for job ${job.id}:`, err);
        }
      }

      await systemDb
        .update(buildJobs)
        .set({
          status: "build_failed",
          stage: "reaped_poison_job",
          error: `Stuck-job reaper: job exceeded ${maxAttempts} recovery attempts without heartbeat. Automatically refunded.`,
          updatedAt: new Date(),
        })
        .where(eq(buildJobs.id, job.id));

      reapedJobs.push({
        jobId: job.id,
        projectId: job.projectId,
        workspaceId: job.workspaceId,
        previousStatus: job.status,
        action: "refunded_and_failed",
        refundAmountCents,
        reason: `Poison job: exceeded ${maxAttempts} attempts. Terminated with automatic platform refund.`,
      });
    }
  }

  // 2. Reap stale worker heartbeats (>60 seconds without ping)
  const workerCutoff = new Date(Date.now() - 60_000);
  const staleWorkers = await systemDb
    .select()
    .from(workerHeartbeats)
    .where(lt(workerHeartbeats.lastSeen, workerCutoff));

  for (const worker of staleWorkers) {
    offlineWorkers.push(worker.id);
    await systemDb
      .delete(workerHeartbeats)
      .where(eq(workerHeartbeats.id, worker.id));
  }

  return {
    timestamp: new Date().toISOString(),
    reapedJobs,
    offlineWorkers,
  };
}
