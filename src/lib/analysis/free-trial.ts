import { db } from "@/db";
import { users, orders } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export interface AnalysisEntitlementResult {
  allowed: boolean;
  isFree: boolean;
  reason?: string;
}

/**
 * Atomically claims the 1 complimentary free analysis credit for the user.
 * Returns true if the credit was successfully claimed, false if already consumed.
 */
export async function claimFreeAnalysis(userId: string): Promise<boolean> {
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
 * First analysis is free; subsequent analyses require a paid $5 analysis fee order.
 */
export async function checkAnalysisEntitlement(
  userId: string,
  projectId?: string
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

  // Free analysis credit check: analysis_credits_used < 1
  if (user.analysisCreditsUsed < 1) {
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
