import { Worker, Job } from "bullmq";
import { getRedisConnection, ANALYSIS_QUEUE_NAME, AnalysisJobPayload } from "@/lib/queue/queues";
import { analysisPipeline } from "@/lib/analysis/pipeline";
import { db } from "@/db";
import { projects, jobEvents } from "@/db/schema";
import { eq } from "drizzle-orm";

export function createAnalysisWorker(): Worker<AnalysisJobPayload> {
  const worker: Worker<AnalysisJobPayload> = new Worker(
    ANALYSIS_QUEUE_NAME,
    async (job: Job<AnalysisJobPayload>) => {
      const { projectId } = job.data;
      console.log(`[AnalysisWorker] Processing analysis for project ${projectId} (Job ID: ${job.id})`);

      // Update project status to analyzing
      await db
        .update(projects)
        .set({ status: "analyzing", updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      try {
        const report = await analysisPipeline(projectId);
        console.log(`[AnalysisWorker] Completed analysis for project ${projectId}`);
        return { success: true, classification: report.classification };
      } catch (err: any) {
        console.error(`[AnalysisWorker] Failed analysis for project ${projectId}:`, err);
        await db
          .update(projects)
          .set({ status: "analysis_failed", updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        throw err;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 3,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[AnalysisWorker] Job ${job?.id} failed with error:`, err);
  });

  return worker;
}
