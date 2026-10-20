import { db } from "@/db";
import { outbox } from "@/db/schema";
import { isNull, eq } from "drizzle-orm";
import { analysisQueue, buildQueue, emailQueue } from "./queues";

export async function dispatchOutbox(limit = 50): Promise<number> {
  const pending = await db
    .select()
    .from(outbox)
    .where(isNull(outbox.dispatchedAt))
    .limit(limit);

  if (pending.length === 0) return 0;

  let dispatchedCount = 0;

  for (const item of pending) {
    try {
      const payload = item.payload as any;

      if (item.topic === "analysis.enqueue" || item.topic === "analysis") {
        await analysisQueue.add(
          "analyze",
          { projectId: payload.projectId },
          { jobId: `analysis-${payload.projectId}` }
        );
      } else if (item.topic === "build.enqueue" || item.topic === "build") {
        await buildQueue.add(
          "build",
          { jobId: payload.jobId, projectId: payload.projectId },
          { jobId: `build-${payload.jobId}` }
        );
      } else if (item.topic === "email.send" || item.topic === "email") {
        await emailQueue.add(
          "send",
          payload,
          { jobId: `email-${item.id}` }
        );
      }

      await db
        .update(outbox)
        .set({ dispatchedAt: new Date() })
        .where(eq(outbox.id, item.id));

      dispatchedCount++;
    } catch (err) {
      console.error(`Failed to dispatch outbox entry ${item.id}:`, err);
    }
  }

  return dispatchedCount;
}
