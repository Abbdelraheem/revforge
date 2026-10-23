import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withTenant } from "@/db/tenant";
import { auditLog } from "@/db/schema";
import { loadDeliveryContext } from "@/lib/delivery/context";
import { authorizeDownload } from "@/lib/delivery/authorize";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; archiveId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, archiveId } = await params;
  const context = await loadDeliveryContext(session, projectId);
  if (!context) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const archive = context.gitArchives.find((row) => row.id === archiveId);
  if (!archive) {
    return NextResponse.json(
      { error: "Git archive not found." },
      { status: 404 }
    );
  }

  const auth = authorizeDownload({
    session,
    project: context.project,
    orders: context.orders,
    delivery: {
      id: archive.id,
      storageKey: archive.storageKey,
      expiresAt: archive.expiresAt,
      createdAt: archive.createdAt,
    },
    now: Date.now(),
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = await storage.getSignedDownloadUrl(auth.storageKey!, 300);

  await withTenant(
    { userId: session.user.id, workspaceId: session.workspace.id },
    (tx) =>
      tx.insert(auditLog).values({
        workspaceId: session.workspace.id,
        userId: session.user.id,
        actorType: "user",
        action: "delivery.git_archive_downloaded",
        resourceType: "delivery_git_archives",
        resourceId: archive.id,
        metadata: { storageKey: archive.storageKey, headCommit: archive.headCommit },
      })
  );

  return NextResponse.redirect(url, { status: 302 });
}
