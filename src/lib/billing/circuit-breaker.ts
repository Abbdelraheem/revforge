import { systemDb } from "@/db";
import { costEvents } from "@/db/schema";
import { gte, sql } from "drizzle-orm";
import { env } from "@/env";

export interface CircuitBreakerStatus {
  tripped: boolean;
  todaySpendCents: number;
  limitCents: number;
  remainingCents: number;
}

/**
 * Checks whether the daily platform spend limit has been exceeded.
 * When tripped, new builds are rejected or queued with a hold, while
 * currently running jobs continue to completion.
 */
export async function checkDailySpendCircuitBreaker(
  db = systemDb
): Promise<CircuitBreakerStatus> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({
      totalCents: sql<number>`coalesce(sum(${costEvents.providerCostCents}), 0)::int`,
    })
    .from(costEvents)
    .where(gte(costEvents.createdAt, startOfDay));

  const todaySpendCents = row?.totalCents ?? 0;
  const limitCents = env.DAILY_SPEND_LIMIT_CENTS;
  const tripped = todaySpendCents >= limitCents;
  const remainingCents = Math.max(0, limitCents - todaySpendCents);

  return {
    tripped,
    todaySpendCents,
    limitCents,
    remainingCents,
  };
}
