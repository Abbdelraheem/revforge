import { NextResponse } from "next/server";
import { db } from "@/db";
import { workerHeartbeats } from "@/db/schema";
import { gt, desc } from "drizzle-orm";
import { getRedisConnection } from "@/lib/queue/queues";

export const runtime = "nodejs";

export async function GET() {
  const startTime = Date.now();
  let dbHealthy = false;
  let redisHealthy = false;
  let activeWorkers = 0;

  // 1. Check DB
  try {
    const recentCutoff = new Date(Date.now() - 60_000); // seen in last 60s
    const workers = await db
      .select()
      .from(workerHeartbeats)
      .where(gt(workerHeartbeats.lastSeen, recentCutoff))
      .orderBy(desc(workerHeartbeats.lastSeen));

    dbHealthy = true;
    activeWorkers = workers.length;
  } catch {
    dbHealthy = false;
  }

  // 2. Check Redis
  try {
    const redis = getRedisConnection();
    const pong = await redis.ping();
    redisHealthy = pong === "PONG";
  } catch {
    redisHealthy = false;
  }

  const allHealthy = dbHealthy && redisHealthy;
  const latencyMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      latencyMs,
      services: {
        database: dbHealthy ? "operational" : "failing",
        redis: redisHealthy ? "operational" : "failing",
        workers: activeWorkers > 0 ? "operational" : "idle",
        activeWorkersCount: activeWorkers,
      },
    },
    { status: allHealthy ? 200 : 503 }
  );
}
