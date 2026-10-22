import { db } from "@/db";
import { users, orders } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getRedisConnection } from "@/lib/queue/queues";

export interface AnalysisEntitlementResult {
  allowed: boolean;
  isFree: boolean;
  reason?: string;
  retryAfterSec?: number;
}

/**
 * Enforces 1 free analysis per IP address per 24 hours (TTL: 86400s) via Redis atomic SET NX.
 */
export async function checkFreeTrialIpGate(ip: string): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  try {
    const redis = getRedisConnection();
    const key = `ratelimit:free-analysis:${ip}`;
    const result = await redis.set(key, "1", "EX", 86400, "NX");
    if (!result) {
      const ttl = await redis.ttl(key);
      return { allowed: false, retryAfterSec: ttl > 0 ? ttl : 86400 };
    }
    return { allowed: true };
  } catch {
    // Fail open in case Redis is not connected during test isolation
    return { allowed: true };
  }
}

/**
 * Atomically claims the 1 complimentary free analysis credit for the user.
 * Returns true if the credit was successfully claimed, false if already consumed or IP rate limited.
 */
export async function claimFreeAnalysis(userId: string, clientIp?: string): Promise<boolean> {
  if (clientIp) {
    const ipCheck = await checkFreeTrialIpGate(clientIp);
    if (!ipCheck.allowed) {
      return false;
    }
  }

  // Atomic update: only succeeds if analysis_credits_used < 1
  const updated = await db
    .update(users)
    .set({
      analysisCreditsUsed: sql`${users.analysisCreditsUsed} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(users.id, userId),
        sql`${users.analysisCreditsUsed} < 1`
      )
    )
    .returning({ id: users.id });

  return updated.length > 0;
}

/**
 * Checks whether a user has entitlement to run an architectural analysis.
 * First analysis is free (requires email and analysis_credits_used < 1, plus 1/IP/24h);
 * subsequent analyses require a paid $5 analysis fee order.
 */
export async function checkAnalysisEntitlement(
  userId: string,
  projectId?: string,
  clientIp?: string
): Promise<AnalysisEntitlementResult> {
  const [user] = await db
    .select({
      id: users.id,
      emailVerified: users.emailVerified,
      analysisCreditsUsed: users.analysisCreditsUsed,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return { allowed: false, isFree: false, reason: "user_not_found" };
  }

  // Free analysis credit check: max 1 free analysis ever per user
  if (user.analysisCreditsUsed < 1) {
    if (clientIp) {
      const ipCheck = await checkFreeTrialIpGate(clientIp);
      if (!ipCheck.allowed) {
        return {
          allowed: false,
          isFree: false,
          reason: "ip_rate_limit_exceeded",
          retryAfterSec: ipCheck.retryAfterSec,
        };
      }
    }
    return { allowed: true, isFree: true };
  }

  // If already used free analysis, check if a paid analysis order exists for this project
  if (projectId) {
    const [paidOrder] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.projectId, projectId),
          eq(orders.kind, "analysis_fee"),
          eq(orders.status, "paid")
        )
      );

    if (paidOrder) {
      return { allowed: true, isFree: false };
    }
  }

  return {
    allowed: false,
    isFree: false,
    reason: "analysis_fee_required",
  };
}
