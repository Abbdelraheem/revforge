import { systemDb } from "@/db";
import { workerHeartbeats } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createAnalysisWorker } from "./analysis-worker";
import { createBuildWorker } from "./build-worker";
import { dispatchOutbox } from "@/lib/queue/outbox";
import { reapStuckJobs } from "@/lib/worker/reaper";

const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}-${Date.now().toString(36)}`;
const HEARTBEAT_INTERVAL_MS = 10_000;
const OUTBOX_INTERVAL_MS = 5_000;
const REAPER_INTERVAL_MS = 60_000;

async function recordHeartbeat(): Promise<void> {
  try {
    await systemDb
      .insert(workerHeartbeats)
      .values({
        id: WORKER_ID,
        lastSeen: new Date(),
        version: "v3.0.0",
        capacity: 4,
      })
      .onConflictDoUpdate({
        target: workerHeartbeats.id,
        set: {
          lastSeen: new Date(),
        },
      });
  } catch (err) {
    console.error("[Worker] Failed to record heartbeat:", err);
  }
}

async function removeHeartbeat(): Promise<void> {
  try {
    await systemDb
      .delete(workerHeartbeats)
      .where(eq(workerHeartbeats.id, WORKER_ID));
  } catch {}
}

async function startWorkers(): Promise<void> {
  process.stdout.write(`[Worker] Starting RevForge worker daemon with ID: ${WORKER_ID}\n`);

  // 1. Initial heartbeat
  await recordHeartbeat();

  // 2. Start analysis & build workers
  const analysisWorker = createAnalysisWorker();
  const buildWorker = createBuildWorker();

  // 3. Heartbeat timer
  const heartbeatTimer = setInterval(async () => {
    await recordHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);

  // 4. Outbox dispatcher timer
  const outboxTimer = setInterval(async () => {
    try {
      await dispatchOutbox();
    } catch (err) {
      console.error("[Worker] Outbox dispatch error:", err);
    }
  }, OUTBOX_INTERVAL_MS);

  // 5. Stuck-job reaper timer
  const reaperTimer = setInterval(async () => {
    try {
      const summary = await reapStuckJobs();
      if (summary.reapedJobs.length > 0) {
        process.stdout.write(`[Reaper] Handled ${summary.reapedJobs.length} stuck jobs.\n`);
      }
    } catch (err) {
      console.error("[Worker] Reaper error:", err);
    }
  }, REAPER_INTERVAL_MS);

  // Graceful shutdown (SIGTERM / SIGINT)
  let isShuttingDown = false;
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    process.stdout.write("[Worker] SIGTERM/SIGINT received. Draining workers gracefully...\n");

    clearInterval(heartbeatTimer);
    clearInterval(outboxTimer);
    clearInterval(reaperTimer);

    // Close BullMQ workers (waits for active jobs to finish or abort safely)
    await Promise.allSettled([
      analysisWorker.close(),
      buildWorker.close(),
      removeHeartbeat(),
    ]);

    process.stdout.write("[Worker] All workers drained. Exiting clean.\n");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (require.main === module) {
  startWorkers().catch((err) => {
    console.error("[Worker] Fatal startup error:", err);
    process.exit(1);
  });
}

export { startWorkers, recordHeartbeat };
