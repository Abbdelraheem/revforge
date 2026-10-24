import { systemDb } from "@/db";
import { creditsLedger } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { issueCredits } from "./credits";

export const REFERRAL_BONUS_CENTS = 2500; // $25 in platform credits
export const MAX_MONTHLY_REFERRAL_BONUS_CENTS = 25000; // $250 max per month per workspace

export function generateReferralCode(workspaceId: string): string {
  const clean = workspaceId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `REF-${clean}`;
}

export function parseWorkspaceIdFromReferralCode(code: string): string | null {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed.startsWith("REF-")) return null;
  return trimmed.slice(4);
}

export async function canClaimReferral(params: {
  referrerWorkspaceId: string;
  referredWorkspaceId: string;
}): Promise<{ allowed: boolean; reason?: string }> {
  const { referrerWorkspaceId, referredWorkspaceId } = params;

  if (referrerWorkspaceId === referredWorkspaceId) {
    return { allowed: false, reason: "Self-referrals are forbidden" };
  }

  // Check monthly cap on referrer workspace
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [earnedRow] = await systemDb
    .select({
      total: sql<number>`coalesce(sum(${creditsLedger.deltaCents}), 0)::int`,
    })
    .from(creditsLedger)
    .where(
      and(
        eq(creditsLedger.workspaceId, referrerWorkspaceId),
        eq(creditsLedger.kind, "grant"),
        gte(creditsLedger.createdAt, startOfMonth)
      )
    );

  const earnedThisMonth = Number(earnedRow?.total ?? 0);
  if (earnedThisMonth >= MAX_MONTHLY_REFERRAL_BONUS_CENTS) {
    return {
      allowed: false,
      reason: "Referrer monthly referral credit limit reached ($250/mo)",
    };
  }

  return { allowed: true };
}

export async function rewardReferralBonus(params: {
  referrerWorkspaceId: string;
  referredWorkspaceId: string;
  orderId: string;
}): Promise<{ rewarded: boolean; amountCents: number; reason?: string }> {
  const { referrerWorkspaceId, referredWorkspaceId, orderId } = params;

  const check = await canClaimReferral({ referrerWorkspaceId, referredWorkspaceId });
  if (!check.allowed) {
    return { rewarded: false, amountCents: 0, reason: check.reason };
  }

  // Issue referral grant to referrer
  await issueCredits({
    workspaceId: referrerWorkspaceId,
    amountCents: REFERRAL_BONUS_CENTS,
    reason: `Referral bonus for qualified build order #${orderId.slice(0, 8)}`,
    orderId,
  });

  return { rewarded: true, amountCents: REFERRAL_BONUS_CENTS };
}
