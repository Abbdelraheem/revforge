import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withTenant } from "@/db/tenant";
import { auditLog } from "@/db/schema";
import {
  isExpired,
  loadDeliveryContext,
  versionExpiresAt,
} from "@/lib/delivery/context";
import { authorizeDownload } from "@/lib/delivery/authorize";
import { sendDeliveryReadyEmail } from "@/lib/email/send";
import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const context = await loadDeliveryContext(session, projectId);
  if (!context) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const auth = authorizeDownload({
    session,
    project: context.project,
    orders: context.orders,
    delivery: context.delivery,
    now: Date.now(),
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const latestVersion = context.versions[0] || null;
  const expiresAt = latestVersion
    ? versionExpiresAt(latestVersion, context.retentionDays)
    : context.delivery?.expiresAt;

  if (!expiresAt || isExpired(expiresAt)) {
    return NextResponse.json(
      {
        error: `Delivery retention expired on ${expiresAt?.toISOString() || "an unknown date"}.`,
        code: "delivery_expired",
      },
      { status: 410 }
    );
  }

  const to = context.ownerEmail || session.user.email;
  if (!to) {
    return NextResponse.json(
      { error: "No delivery email recipient is recorded for this project." },
      { status: 409 }
    );
  }

  const result = await sendDeliveryReadyEmail({
    to,
    projectName: context.project.name,
    deliveryUrl: `${env.APP_URL}/projects/${projectId}/delivery`,
    sha256: latestVersion ? undefined : context.delivery!.sha256,
    sizeBytes: latestVersion ? undefined : context.delivery!.sizeBytes,
    expiresAt,
    versionLabel: latestVersion?.label,
  });

  await withTenant(
    { userId: session.user.id, workspaceId: session.workspace.id },
    (tx) =>
      tx.insert(auditLog).values({
        workspaceId: session.workspace.id,
        userId: session.user.id,
        actorType: "user",
        action: result.success
          ? "delivery.email_resent"
          : "delivery.email_resend_failed",
        resourceType: "projects",
        resourceId: projectId,
        metadata: {
          to,
          error: result.error ?? null,
          versionId: latestVersion?.id ?? null,
        },
      })
  );

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "The delivery email could not be sent." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    sent: true,
    to,
    messageId: result.id ?? null,
  });
}
