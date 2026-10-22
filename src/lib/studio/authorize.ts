import { systemDb } from "@/db";
import {
  projects,
  workspaces,
  users,
  workspaceMembers,
  studioVersions,
  creditsLedger,
  deliveries,
  buildJobs,
} from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export class StudioAuthError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "StudioAuthError";
    this.status = status;
    this.code = code;
  }
}

export interface StudioAuthResult {
  project: typeof projects.$inferSelect;
  workspace: typeof workspaces.$inferSelect;
  user: typeof users.$inferSelect;
  activeVersion: typeof studioVersions.$inferSelect | null;
  balanceCents: number;
}

/**
 * Authorizes a user to access the Studio editor for a given project.
 * Enforces strict order of gates:
 * 1. 401: Unauthenticated (no userId)
 * 2. 404: Project not found
 * 3. 403: Tenant mismatch (user does not belong to project's workspace)
 * 4. 409: Project not in ['delivered', 'delivered_partial']
 *
 * Returns project, workspace, user, activeVersion, and credit balance in cents.
 */
export async function authorizeStudio(
  projectId: string,
  userId?: string | null
): Promise<StudioAuthResult> {
  // 1. 401: Unauthenticated
  if (!userId) {
    throw new StudioAuthError(401, "UNAUTHENTICATED", "Authentication required to access Studio.");
  }

  // Fetch user
  const [user] = await systemDb
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    throw new StudioAuthError(401, "UNAUTHENTICATED", "User not found.");
  }

  // 2. 404: Project not found
  const [project] = await systemDb
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    throw new StudioAuthError(404, "NOT_FOUND", `Project "${projectId}" not found.`);
  }

  // 3. 403: Tenant mismatch (must be member or owner of project's workspace)
  const [workspace] = await systemDb
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, project.workspaceId));

  if (!workspace) {
    throw new StudioAuthError(404, "NOT_FOUND", "Project workspace not found.");
  }

  const isOwner = workspace.ownerId === user.id;
  if (!isOwner) {
    const [membership] = await systemDb
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, project.workspaceId),
          eq(workspaceMembers.userId, user.id)
        )
      );

    if (!membership) {
      throw new StudioAuthError(
        403,
        "TENANT_MISMATCH",
        "Access forbidden: User does not belong to project workspace."
      );
    }
  }

  // 4. 409: Project not in ['delivered', 'delivered_partial']
  const validStatuses = ["delivered", "delivered_partial"];
  if (!validStatuses.includes(project.status)) {
    throw new StudioAuthError(
      409,
      "INVALID_STATE",
      `Studio editor requires project to be delivered or delivered_partial. Current status: ${project.status}`
    );
  }

  // 5. Active Studio Version
  let [activeVersion] = await systemDb
    .select()
    .from(studioVersions)
    .where(eq(studioVersions.projectId, project.id))
    .orderBy(desc(studioVersions.versionNumber))
    .limit(1);

  // If no studio version has been initialized yet, synthesize or bootstrap v1 from delivery
  if (!activeVersion) {
    const [delivery] = await systemDb
      .select({ storageKey: deliveries.storageKey })
      .from(deliveries)
      .innerJoin(buildJobs, eq(deliveries.jobId, buildJobs.id))
      .where(eq(buildJobs.projectId, project.id))
      .orderBy(desc(deliveries.createdAt))
      .limit(1);

    if (delivery) {
      const [bootstrapped] = await systemDb
        .insert(studioVersions)
        .values({
          projectId: project.id,
          workspaceId: project.workspaceId,
          versionNumber: 1,
          label: "v1: Initial Clean-Room Delivery",
          zipStorageKey: delivery.storageKey,
          createdBy: user.id,
          filesManifest: [],
        })
        .returning();
      activeVersion = bootstrapped;
    }
  }

  // 6. Calculate Workspace Balance in cents
  const [balanceRow] = await systemDb
    .select({
      total: sql<string>`coalesce(sum(${creditsLedger.deltaCents}), 0)`,
    })
    .from(creditsLedger)
    .where(eq(creditsLedger.workspaceId, project.workspaceId));

  const balanceCents = Number(balanceRow?.total || 0);

  return {
    project,
    workspace,
    user,
    activeVersion: activeVersion || null,
    balanceCents,
  };
}
