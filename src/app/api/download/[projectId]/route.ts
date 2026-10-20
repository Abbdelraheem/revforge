import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, orders, buildJobs, deliveries, auditLog } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { StorageService } from "@/lib/storage/service";

export const runtime = "nodejs";

/**
 * Authenticated, paid-only download gate.
 * 1. Checks user session.
 * 2. Checks tenant ownership of project.
 * 3. Checks that the project has a 'paid' or 'paid_by_credit' order.
 * 4. Checks project status is 'delivered' or 'delivered_partial'.
 * 5. Serves delivery from storage via signed URL (presigned download).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required to download project artifacts." },
      { status: 401 }
    );
  }

  // 1. Verify project ownership within tenant workspace
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.workspaceId, session.workspace.id)
      )
    );

  if (!project) {
    return NextResponse.json(
      { error: "Project not found or unauthorized access." },
      { status: 404 }
    );
  }

  // 2. Verify payment status: must have a paid or paid_by_credit order
  const [paidOrder] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.projectId, projectId),
        eq(orders.workspaceId, session.workspace.id)
      )
    );

  const isPaid = paidOrder && (paidOrder.status === "paid" || paidOrder.status === "paid_by_credit");

  if (!isPaid) {
    return NextResponse.json(
      { error: "Access denied. Project requires a completed payment to unlock source download." },
      { status: 403 }
    );
  }

  // 3. Verify project status allows delivery
  const isDelivered =
    project.status === "delivered" ||
    project.status === "delivered_partial";

  if (!isDelivered) {
    return NextResponse.json(
      { error: `Download not ready. Project current status is '${project.status}'.` },
      { status: 400 }
    );
  }

  // 4. Fetch the delivery record for this project
  const [job] = await db
    .select()
    .from(buildJobs)
    .where(
      and(
        eq(buildJobs.projectId, projectId),
        eq(buildJobs.workspaceId, session.workspace.id)
      )
    )
    .orderBy(desc(buildJobs.createdAt))
    .limit(1);

  if (!job) {
    return NextResponse.json(
      { error: "No build job found for this project." },
      { status: 404 }
    );
  }

  const [delivery] = await db
    .select()
    .from(deliveries)
    .where(
      and(
        eq(deliveries.jobId, job.id),
        eq(deliveries.workspaceId, session.workspace.id)
      )
    )
    .orderBy(desc(deliveries.createdAt))
    .limit(1);

  const storageKey = delivery?.storageKey || `deliveries/${session.workspace.id}/${projectId}.zip`;

  // 5. Generate secure signed URL for delivery (presigned download)
  const downloadUrl = await StorageService.createDeliverySignedUrl(storageKey, 300);

  // 6. Record download in audit log
  await db.insert(auditLog).values({
    workspaceId: session.workspace.id,
    userId: session.user.id,
    actorType: "user",
    action: "project.source_downloaded",
    resourceType: "projects",
    resourceId: projectId,
    metadata: {
      orderId: paidOrder.id,
      amountCents: paidOrder.amountCents,
      storageKey,
      deliveryId: delivery?.id,
    },
  });

  // Redirect client to presigned download URL
  return NextResponse.redirect(downloadUrl, { status: 302 });
}
