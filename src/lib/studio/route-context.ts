import { and, desc, eq, sql } from "drizzle-orm";
import { withTenant } from "@/db/tenant";
import {
  creditsLedger,
  orders,
  projects,
  studioEdits,
  studioVersions,
} from "@/db/schema";
import type { AuthSession } from "@/lib/auth";

export interface StudioRouteData {
  project: typeof projects.$inferSelect | null;
  orders: Array<typeof orders.$inferSelect>;
  balanceCents: number;
  versions: Array<typeof studioVersions.$inferSelect>;
  edits: Array<typeof studioEdits.$inferSelect>;
}

/**
 * Loads everything Studio authorization needs inside the caller's tenant
 * transaction. User-facing handlers must never use `systemDb`.
 */
export async function loadStudioRouteData(
  session: AuthSession,
  projectId: string
): Promise<StudioRouteData> {
  const workspaceId = session.workspace.id;

  return withTenant(
    { userId: session.user.id, workspaceId },
    async (tx) => {
      const [project] = await tx
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.workspaceId, workspaceId)
          )
        );

      const projectOrders = project
        ? await tx
            .select()
            .from(orders)
            .where(
              and(
                eq(orders.projectId, projectId),
                eq(orders.workspaceId, workspaceId)
              )
            )
        : [];

      const [balanceRow] = await tx
        .select({
          total: sql<number>`coalesce(sum(${creditsLedger.deltaCents}), 0)::int`,
        })
        .from(creditsLedger)
        .where(eq(creditsLedger.workspaceId, workspaceId));

      const versions = project
        ? await tx
            .select()
            .from(studioVersions)
            .where(
              and(
                eq(studioVersions.projectId, projectId),
                eq(studioVersions.workspaceId, workspaceId)
              )
            )
            .orderBy(desc(studioVersions.versionNumber))
        : [];

      const edits = project
        ? await tx
            .select()
            .from(studioEdits)
            .where(
              and(
                eq(studioEdits.projectId, projectId),
                eq(studioEdits.workspaceId, workspaceId)
              )
            )
            .orderBy(desc(studioEdits.createdAt))
        : [];

      return {
        project: project || null,
        orders: projectOrders,
        balanceCents: Number(balanceRow?.total ?? 0),
        versions,
        edits,
      };
    }
  );
}
