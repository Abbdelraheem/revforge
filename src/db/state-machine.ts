import { eq, and, sql } from "drizzle-orm";
import type { DbTx } from "./tenant";
import { projects, auditLog } from "./schema";

export type ProjectStatus =
  | "draft"
  | "analyzing"
  | "analyzed"
  | "analysis_failed"
  | "awaiting_payment"
  | "paid"
  | "queued"
  | "building"
  | "verifying"
  | "delivered"
  | "delivered_partial"
  | "build_failed"
  | "credited"
  | "cancelled";

export type TransitionActor =
  | { type: "user"; userId: string; ipAddress?: string }
  | { type: "analysis_worker" }
  | { type: "build_worker" }
  | { type: "webhook"; providerTxnId?: string }
  | { type: "system"; reason?: string }
  | { type: "admin"; adminId: string; reason?: string };

// Allowed state transitions and their authorized actors per Section 4.2
const ALLOWED_TRANSITIONS: Record<
  ProjectStatus,
  Partial<Record<ProjectStatus, string[]>>
> = {
  draft: {
    analyzing: ["user"],
    cancelled: ["user"],
  },
  analyzing: {
    analyzed: ["analysis_worker"],
    analysis_failed: ["analysis_worker"],
    cancelled: ["user"],
  },
  analyzed: {
    awaiting_payment: ["system", "user"],
    cancelled: ["user"],
  },
  analysis_failed: {
    draft: ["user"],
    cancelled: ["user"],
  },
  awaiting_payment: {
    paid: ["webhook", "system"], // webhook for paddle, system for credits-only order
    cancelled: ["user", "system"], // system for order expiry
  },
  paid: {
    queued: ["system", "webhook"],
  },
  queued: {
    building: ["build_worker", "system"],
    cancelled: ["admin", "system"],
  },
  building: {
    verifying: ["build_worker"],
    build_failed: ["build_worker", "system"],
  },
  verifying: {
    delivered: ["build_worker"],
    delivered_partial: ["build_worker"],
    build_failed: ["build_worker"],
  },
  delivered: {},
  delivered_partial: {
    credited: ["system", "admin"],
  },
  build_failed: {
    credited: ["system", "admin"],
  },
  credited: {},
  cancelled: {},
};

/**
 * Transitions project status strictly following Section 4.2.
 * Rejects illegal moves and records an append-only audit_log row in the same transaction.
 */
export async function transitionProject(
  tx: DbTx,
  projectId: string,
  from: ProjectStatus,
  to: ProjectStatus,
  actor: TransitionActor
): Promise<void> {
  const allowedActors = ALLOWED_TRANSITIONS[from]?.[to];

  if (!allowedActors || !allowedActors.includes(actor.type)) {
    throw new Error(
      `Illegal project state transition from '${from}' to '${to}' by actor '${actor.type}'`
    );
  }

  // Update status atomically ensuring the current status matches 'from'
  const updated = await tx
    .update(projects)
    .set({
      status: to,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, projectId), eq(projects.status, from)))
    .returning({
      id: projects.id,
      workspaceId: projects.workspaceId,
      userId: projects.userId,
    });

  if (updated.length === 0) {
    throw new Error(
      `Failed to transition project ${projectId}: current status does not match expected '${from}'`
    );
  }

  const proj = updated[0]!;

  // Write append-only audit_log row
  await tx.insert(auditLog).values({
    workspaceId: proj.workspaceId,
    userId: actor.type === "user" ? actor.userId : proj.userId,
    actorType: actor.type,
    action: `project.status_transition.${from}_to_${to}`,
    resourceType: "projects",
    resourceId: projectId,
    metadata: {
      from,
      to,
      actor,
      timestamp: new Date().toISOString(),
    },
    ipAddress: actor.type === "user" ? actor.ipAddress : undefined,
  });
}
