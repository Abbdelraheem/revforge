import { and, desc, eq } from "drizzle-orm";
import { withTenant } from "@/db/tenant";
import {
  buildJobs,
  deliveries,
  deliveryGitArchives,
  orders,
  projects,
  studioVersions,
  users,
} from "@/db/schema";
import type { AuthSession } from "@/lib/auth";
import { env } from "@/env";

export interface DeliveryContext {
  project: typeof projects.$inferSelect;
  orders: Array<typeof orders.$inferSelect>;
  latestJob: typeof buildJobs.$inferSelect | null;
  delivery: typeof deliveries.$inferSelect | null;
  versions: Array<typeof studioVersions.$inferSelect>;
  gitArchives: Array<typeof deliveryGitArchives.$inferSelect>;
  ownerEmail: string | null;
  retentionDays: number;
}

export async function loadDeliveryContext(
  session: AuthSession,
  projectId: string
): Promise<DeliveryContext | null> {
  const workspaceId = session.workspace.id;

  return withTenant(
    { userId: session.user.id, workspaceId },
    async (tx) => {
      const [project] = await tx
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId))
        )
        .limit(1);

      if (!project) return null;

      const [projectOrders, jobs, versions, archives, owner] = await Promise.all([
        tx
          .select()
          .from(orders)
          .where(
            and(eq(orders.projectId, projectId), eq(orders.workspaceId, workspaceId))
          ),
        tx
          .select()
          .from(buildJobs)
          .where(
            and(
              eq(buildJobs.projectId, projectId),
              eq(buildJobs.workspaceId, workspaceId)
            )
          )
          .orderBy(desc(buildJobs.createdAt))
          .limit(1),
        tx
          .select()
          .from(studioVersions)
          .where(
            and(
              eq(studioVersions.projectId, projectId),
              eq(studioVersions.workspaceId, workspaceId)
            )
          )
          .orderBy(desc(studioVersions.versionNumber)),
        tx
          .select()
          .from(deliveryGitArchives)
          .where(
            and(
              eq(deliveryGitArchives.projectId, projectId),
              eq(deliveryGitArchives.workspaceId, workspaceId)
            )
          )
          .orderBy(desc(deliveryGitArchives.createdAt)),
        tx
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, project.userId))
          .limit(1),
      ]);

      const latestJob = jobs[0] || null;
      let delivery: typeof deliveries.$inferSelect | null = null;

      if (latestJob) {
        const [row] = await tx
          .select()
          .from(deliveries)
          .where(
            and(
              eq(deliveries.jobId, latestJob.id),
              eq(deliveries.workspaceId, workspaceId)
            )
          )
          .orderBy(desc(deliveries.createdAt))
          .limit(1);
        delivery = row || null;
      }

      return {
        project,
        orders: projectOrders,
        latestJob,
        delivery,
        versions,
        gitArchives: archives,
        ownerEmail: owner[0]?.email || null,
        retentionDays: env.DELIVERY_RETENTION_DAYS,
      };
    }
  );
}

export function versionExpiresAt(
  version: { createdAt: Date },
  retentionDays: number
): Date {
  return new Date(version.createdAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
}

export function isExpired(expiresAt: Date, now = Date.now()): boolean {
  return expiresAt.getTime() <= now;
}
