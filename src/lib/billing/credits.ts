import { db } from "@/db";
import { creditsLedger, auditLog } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface WorkspaceCreditBalance {
  workspaceId: string;
  balanceCents: number;
}

/**
 * Gets the net available platform credit balance for a workspace in integer cents.
 * credits_ledger is append-only; balance is calculated as SUM(delta_cents).
 */
export async function getWorkspaceCreditBalance(workspaceId: string): Promise<number> {
  const [result] = await db
    .select({
      total: sql<number>`coalesce(sum(${creditsLedger.deltaCents}), 0)::int`,
    })
    .from(creditsLedger)
    .where(eq(creditsLedger.workspaceId, workspaceId));

  return Math.max(0, result?.total ?? 0);
}

/**
 * Issues platform credits (e.g. for failed build, delivery credit, or admin compensation).
 */
export async function issueCredits(params: {
  workspaceId: string;
  amountCents: number;
  reason: string;
  orderId?: string;
  buildJobId?: string;
  createdBy?: string;
}): Promise<void> {
  if (params.amountCents <= 0) return;

  await db.insert(creditsLedger).values({
    workspaceId: params.workspaceId,
    deltaCents: Math.round(params.amountCents),
    reason: params.reason,
    orderId: params.orderId,
    buildJobId: params.buildJobId,
    createdBy: params.createdBy,
  });

  await db.insert(auditLog).values({
    workspaceId: params.workspaceId,
    actorType: params.createdBy ? "user" : "system",
    action: "credits.issued",
    resourceType: "credits_ledger",
    resourceId: params.orderId || params.buildJobId || params.workspaceId,
    metadata: {
      amountCents: params.amountCents,
      reason: params.reason,
      orderId: params.orderId,
      buildJobId: params.buildJobId,
    },
  });
}

/**
 * Deducts platform credits when applied against an order.
 */
export async function deductCredits(params: {
  workspaceId: string;
  amountCents: number;
  orderId: string;
  reason?: string;
}): Promise<void> {
  if (params.amountCents <= 0) return;

  await db.insert(creditsLedger).values({
    workspaceId: params.workspaceId,
    deltaCents: -Math.abs(Math.round(params.amountCents)),
    reason: params.reason || `Applied to order ${params.orderId}`,
    orderId: params.orderId,
  });

  await db.insert(auditLog).values({
    workspaceId: params.workspaceId,
    actorType: "system",
    action: "credits.deducted",
    resourceType: "credits_ledger",
    resourceId: params.orderId,
    metadata: {
      amountCents: params.amountCents,
      orderId: params.orderId,
    },
  });
}
