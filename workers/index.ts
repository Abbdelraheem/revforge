import { systemDb } from "@/db";
import { workerHeartbeats } from "@/db/schema";
import { createAnalysisWorker } from "./analysis-worker";
import { dispatchOutbox } from "@/lib/queue/outbox";
import { sql } from "drizzle-orm";

const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}-${Date.now().toString(36)}`;
const HEARTBEAT_INTERVAL_MS = 10_000;
const OUTBOX_INTERVAL_MS = 5_000;

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

async function startWorkers(): Promise<void> {
  process.stdout.write(`[Worker] Starting RevForge worker daemon with ID: ${WORKER_ID}\n`);

  // 1. Initial heartbeat
  await recordHeartbeat();

  // 2. Start analysis worker
  const analysisWorker = createAnalysisWorker();

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

  // Graceful shutdown
  const shutdown = async () => {
    process.stdout.write("[Worker] Shutting down workers gracefully...\n");
    clearInterval(heartbeatTimer);
    clearInterval(outboxTimer);
    await analysisWorker.close();
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
