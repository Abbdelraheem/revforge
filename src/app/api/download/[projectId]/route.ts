import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withTenant } from "@/db/tenant";
import {
  projects,
  orders,
  buildJobs,
  deliveries,
  studioVersions,
  auditLog,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { storage } from "@/lib/storage";
import { authorizeDownload } from "@/lib/delivery/authorize";
import { versionExpiresAt } from "@/lib/delivery/context";
import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const versionId = req.nextUrl.searchParams.get("versionId");
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required to download project artifacts." },
      { status: 401 }
    );
  }

  const workspaceId = session.workspace.id;

  // Load project, orders, and delivery records strictly via withTenant
  const data = await withTenant(
    { userId: session.user.id, workspaceId },
    async (tx) => {
      const [proj] = await tx
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.workspaceId, workspaceId)
          )
        );

      if (!proj) return null;

      const projectOrders = await tx
        .select({
          id: orders.id,
          kind: orders.kind,
          status: orders.status,
        })
        .from(orders)
        .where(
          and(
            eq(orders.projectId, projectId),
            eq(orders.workspaceId, workspaceId)
          )
        );

      const [latestJob] = await tx
        .select()
        .from(buildJobs)
        .where(
          and(
            eq(buildJobs.projectId, projectId),
            eq(buildJobs.workspaceId, workspaceId)
          )
        )
        .orderBy(desc(buildJobs.createdAt))
        .limit(1);

      let deliveryRecord = null;
      if (latestJob) {
        const [del] = await tx
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
        deliveryRecord = del;
      }

      let selectedVersion: typeof studioVersions.$inferSelect | null = null;
      if (versionId) {
        const [version] = await tx
          .select()
          .from(studioVersions)
          .where(
            and(
              eq(studioVersions.id, versionId),
              eq(studioVersions.projectId, projectId),
              eq(studioVersions.workspaceId, workspaceId)
            )
          )
          .limit(1);
        selectedVersion = version || null;
      }

      return {
        project: proj,
        orders: projectOrders,
        delivery: deliveryRecord,
        selectedVersion,
      };
    }
  );

  if (versionId && !data?.selectedVersion) {
    return NextResponse.json(
      { error: "The requested Studio version does not exist for this project." },
      { status: 404 }
    );
  }

  const version = data?.selectedVersion || null;
  const authDelivery = version
    ? {
        id: version.id,
        storageKey: version.zipStorageKey,
        expiresAt: versionExpiresAt(version, env.DELIVERY_RETENTION_DAYS),
        createdAt: version.createdAt,
      }
    : data?.delivery || null;

  const authResult = authorizeDownload({
    session,
    project: data?.project || null,
    orders: data?.orders || [],
    delivery: authDelivery,
    now: Date.now(),
  });

  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  // Generate short-lived signed S3 download URL
  const downloadUrl = await storage.getSignedDownloadUrl(authResult.storageKey!, 300);

  // Record download in audit log via withTenant
  await withTenant(
    { userId: session.user.id, workspaceId },
    async (tx) => {
      await tx.insert(auditLog).values({
        workspaceId,
        userId: session.user.id,
        actorType: "user",
        action: "project.source_downloaded",
        resourceType: "projects",
        resourceId: projectId,
        metadata: {
          storageKey: authResult.storageKey,
          deliveryId: version ? null : data?.delivery?.id,
          versionId: version?.id ?? null,
          versionNumber: version?.versionNumber ?? null,
        },
      });
    }
  );

  return NextResponse.redirect(downloadUrl, { status: 302 });
}
