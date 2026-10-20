import { db } from "@/db";
import { jobEvents, buildJobs } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface ObserverEventPayload {
  stage: string;
  iteration?: number;
  message: string;
  parityScore?: number;
  model?: string;
  costCents?: number;
}

export class BuildObserver {
  constructor(
    private workspaceId: string,
    private jobId: string
  ) {}

  async emit(type: string, payload: ObserverEventPayload): Promise<void> {
    await db.insert(jobEvents).values({
      workspaceId: this.workspaceId,
      jobId: this.jobId,
      type,
      payload,
    });

    if (payload.stage) {
      await db
        .update(buildJobs)
        .set({
          stage: payload.stage,
          heartbeatAt: new Date(),
          updatedAt: new Date(),
          ...(payload.parityScore !== undefined ? { parityScore: payload.parityScore } : {}),
        })
        .where(eq(buildJobs.id, this.jobId));
    }
  }
}
