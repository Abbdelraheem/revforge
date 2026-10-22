import { systemDb } from "@/db";
import { buildJobs, projects } from "@/db/schema";
import { and, lt, eq, inArray } from "drizzle-orm";
import { buildQueue } from "@/lib/queue/queues";

export interface ReaperConfig {
  heartbeatTimeoutMs: number;
  maxAttempts: number;
}

export const DEFAULT_REAPER_CONFIG: ReaperConfig = {
  heartbeatTimeoutMs: 5 * 60 * 1000, // 5 minutes
  maxAttempts: 3,
};

/**
 * Background reaper that recovers stuck jobs:
 * Checks worker heartbeat timestamps. If a job has hung without a heartbeat:
 * - Retries if attempt < maxAttempts
 * - Transitions to terminal build_failed if attempts exhausted
 */
export async function reapStuckJobs(config = DEFAULT_REAPER_CONFIG): Promise<number> {
  const cutoff = new Date(Date.now() - config.heartbeatTimeoutMs);

  const stuckJobs = await systemDb
    .select()
    .from(buildJobs)
    .where(
      and(
        inArray(buildJobs.status, ["building", "verifying"]),
        lt(buildJobs.heartbeatAt, cutoff)
      )
    );

  let recoveredCount = 0;

  for (const job of stuckJobs) {
    recoveredCount++;
    if (job.attempt < config.maxAttempts) {
      // Retry job
      await systemDb
        .update(buildJobs)
        .set({
          status: "queued",
          attempt: job.attempt + 1,
          heartbeatAt: new Date(),
          updatedAt: new Date(),
          error: `Recovered from worker timeout (attempt ${job.attempt} timed out)`,
        })
        .where(eq(buildJobs.id, job.id));

      await buildQueue.add(`build-${job.id}`, {
        jobId: job.id,
        projectId: job.projectId,
      });
    } else {
      // Exhausted attempts: fail build
      await systemDb
        .update(buildJobs)
        .set({
          status: "build_failed",
          error: "Worker heartbeat expired and maximum retry attempts exceeded.",
          updatedAt: new Date(),
        })
        .where(eq(buildJobs.id, job.id));

      await systemDb
        .update(projects)
        .set({
          status: "build_failed",
          updatedAt: new Date(),
        })
        .where(eq(projects.id, job.projectId));
    }
  }

  return recoveredCount;
}
