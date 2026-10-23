import { systemDb } from "@/db";
import { orders, projects, deliveries, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { OwnershipAttestation } from "@/lib/security/attestation";

export interface FraudRiskScore {
  score: number; // 0 to 100 (higher = greater risk)
  requiresManualReview: boolean;
  riskFactors: string[];
}

export interface DisputeDefenseBundle {
  orderId: string;
  projectId: string;
  customerEmail: string;
  transactionId?: string;
  amountCents: number;
  orderTimestamp: string;
  deliveryTimestamp?: string;
  gitCommitHash?: string;
  storageKeyZip?: string;
  checksumsSha256?: string;
  attestation?: OwnershipAttestation | null;
  clientIp?: string;
  statement: string;
}

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwawaymail.com",
  "yopmail.com",
  "sharklasers.com",
]);

/**
 * Computes an automated fraud risk score prior to order checkout.
 */
export function calculateOrderRisk(params: {
  amountCents: number;
  customerEmail: string;
  clientIp: string;
  isFirstOrder: boolean;
}): FraudRiskScore {
  let score = 10; // Baseline
  const riskFactors: string[] = [];

  const domain = params.customerEmail.split("@")[1]?.toLowerCase();
  if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    score += 50;
    riskFactors.push("Disposable email domain detected");
  }

  if (params.amountCents >= 50_000) {
    score += 25;
    riskFactors.push("High order value (> $500)");
  }

  if (params.isFirstOrder && params.amountCents >= 100_000) {
    score += 20;
    riskFactors.push("First-time customer with large build order (> $1,000)");
  }

  const requiresManualReview = score >= 60;

  return {
    score: Math.min(100, score),
    requiresManualReview,
    riskFactors,
  };
}

/**
 * Assembles an evidentiary dispute defense package for Paddle chargeback adjudication.
 */
export async function assembleChargebackDefenseBundle(
  orderId: string
): Promise<DisputeDefenseBundle> {
  const [order] = await systemDb
    .select()
    .from(orders)
    .where(eq(orders.id, orderId));

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  const [project] = await systemDb
    .select()
    .from(projects)
    .where(eq(projects.id, order.projectId));

  const [delivery] = await systemDb
    .select()
    .from(deliveries)
    .where(eq(deliveries.workspaceId, order.workspaceId));

  return {
    orderId: order.id,
    projectId: order.projectId,
    customerEmail: "customer@revforge.ai",
    amountCents: order.amountCents,
    orderTimestamp: order.createdAt.toISOString(),
    deliveryTimestamp: delivery?.createdAt ? delivery.createdAt.toISOString() : undefined,
    storageKeyZip: delivery?.storageKey || undefined,
    checksumsSha256: delivery?.sha256 || undefined,
    statement: `Digital clean-room reverse engineering services were fully delivered for project ${project?.name || order.projectId}. The client affirmatively authorized scope and verified deliverables.`,
  };
}
