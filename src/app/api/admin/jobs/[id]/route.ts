import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { systemDb } from "@/db";
import { buildJobs, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildQueue } from "@/lib/queue/queues";
import { issueCredits } from "@/lib/billing/credits";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: jobId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  const [job] = await systemDb
    .select()
    .from(buildJobs)
    .where(eq(buildJobs.id, jobId));

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (action === "retry") {
    const nextAttempt = job.attempt + 1;
    await systemDb
      .update(buildJobs)
      .set({
        status: "queued",
        stage: "admin_manual_retry",
        attempt: nextAttempt,
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(buildJobs.id, jobId));

    await buildQueue.add("admin-retry-build", {
      jobId: job.id,
      projectId: job.projectId,
    });

    return NextResponse.json({ success: true, message: `Job ${jobId} re-enqueued for attempt ${nextAttempt}` });
  }

  if (action === "cancel") {
    await systemDb
      .update(buildJobs)
      .set({
        status: "build_failed",
        stage: "admin_cancelled",
        error: "Job cancelled manually by superadmin operator.",
        updatedAt: new Date(),
      })
      .where(eq(buildJobs.id, jobId));

    return NextResponse.json({ success: true, message: `Job ${jobId} cancelled` });
  }

  if (action === "refund") {
    const [order] = await systemDb
      .select()
      .from(orders)
      .where(eq(orders.id, job.orderId));

    if (!order || order.amountCents <= 0) {
      return NextResponse.json({ error: "No billable order found for this job" }, { status: 400 });
    }

    await issueCredits({
      workspaceId: job.workspaceId,
      amountCents: order.amountCents,
      reason: `Operator manual credit refund for build job ${jobId}`,
    });

    await systemDb
      .update(buildJobs)
      .set({
        status: "build_failed",
        stage: "operator_refunded",
        error: `Refunded $${(order.amountCents / 100).toFixed(2)} in platform credits.`,
        updatedAt: new Date(),
      })
      .where(eq(buildJobs.id, jobId));

    return NextResponse.json({
      success: true,
      message: `Issued $${(order.amountCents / 100).toFixed(2)} refund to workspace`,
    });
  }

  return NextResponse.json({ error: "Invalid action. Supported: retry, cancel, refund" }, { status: 400 });
}
