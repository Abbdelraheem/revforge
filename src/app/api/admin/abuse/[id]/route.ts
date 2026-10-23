import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { systemDb } from "@/db";
import { abuseReports, projects, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: reportId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const { action, projectId } = body;

  const [report] = await systemDb
    .select()
    .from(abuseReports)
    .where(eq(abuseReports.id, reportId));

  if (!report) {
    return NextResponse.json({ error: "Abuse report not found" }, { status: 404 });
  }

  if (action === "quarantine") {
    if (projectId) {
      await systemDb
        .update(projects)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(projects.id, projectId));
    }

    await systemDb
      .update(abuseReports)
      .set({ status: "resolved" })
      .where(eq(abuseReports.id, reportId));

    await systemDb.insert(auditLog).values({
      actorType: "admin",
      action: "dmca_quarantine_enforced",
      resourceType: "project",
      resourceId: projectId || reportId,
      metadata: { reportId, reason: report.reason },
    });

    return NextResponse.json({ success: true, message: "Project quarantined and DMCA report resolved." });
  }

  if (action === "dismiss") {
    await systemDb
      .update(abuseReports)
      .set({ status: "dismissed" })
      .where(eq(abuseReports.id, reportId));

    return NextResponse.json({ success: true, message: "Abuse report dismissed." });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
