import { Worker, Job } from "bullmq";
import { getRedisConnection } from "@/lib/queue/queues";
import { runBuild } from "@/lib/build/orchestrator";

export interface BuildJobData {
  jobId: string;
  projectId: string;
  workspaceId: string;
}

export function createBuildWorker(): Worker {
  const connection = getRedisConnection();

  const worker: Worker = new Worker(
    "builds",
    async (job: Job<BuildJobData>) => {
      const { jobId } = job.data;
      const result = await runBuild(jobId);
      return result;
    },
    {
      connection: connection as any,
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    // build completed
  });

  worker.on("failed", (job, err) => {
    // build failed
  });

  return worker;
}

if (process.env.RUN_STANDALONE_WORKER === "true") {
  createBuildWorker();
}
