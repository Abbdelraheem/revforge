import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withTenant } from "@/db/tenant";
import { auditLog, deliveryGitArchives } from "@/db/schema";
import { loadDeliveryContext, versionExpiresAt } from "@/lib/delivery/context";
import { authorizeDownload } from "@/lib/delivery/authorize";
import { buildGitArchive, type GitSnapshot } from "@/lib/delivery/git-archive";
import { storage } from "@/lib/storage";
import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
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
  const sourceExpiry = latestVersion
    ? versionExpiresAt(latestVersion, context.retentionDays)
    : context.delivery?.expiresAt || null;

  if (!sourceExpiry) {
    return NextResponse.json(
      { error: "No delivered archive exists for this project." },
      { status: 404 }
    );
  }

  if (sourceExpiry.getTime() <= Date.now()) {
    return NextResponse.json(
      {
        error: `Delivery retention expired on ${sourceExpiry.toISOString()}.`,
        code: "delivery_expired",
      },
      { status: 410 }
    );
  }

  const existing = context.gitArchives.find(
    (archive) =>
      archive.sourceVersionId === (latestVersion?.id ?? null) &&
      archive.expiresAt.getTime() > Date.now()
  );

  if (existing) {
    const url = await storage.getSignedDownloadUrl(existing.storageKey, 300);
    return NextResponse.json({
      archiveId: existing.id,
      url,
      commitCount: existing.commitCount,
      headCommit: existing.headCommit,
      sha256: existing.sha256,
      sizeBytes: existing.sizeBytes,
      expiresAt: existing.expiresAt.toISOString(),
      reused: true,
    });
  }

  try {
    const snapshots: GitSnapshot[] = [];

    if (context.versions.length > 0) {
      for (const version of [...context.versions].reverse()) {
        const zip = await storage.getObject(version.zipStorageKey);
        snapshots.push({
          label: version.label,
          createdAt: version.createdAt,
          zip,
        });
      }
    } else if (context.delivery) {
      const zip = await storage.getObject(context.delivery.storageKey);
      snapshots.push({
        label: "Initial delivered build",
        createdAt: context.delivery.createdAt,
        zip,
      });
    }

    const result = await buildGitArchive(snapshots);
    const sourceKey = latestVersion?.id || context.latestJob?.id || "latest";
    const storageKey = `deliveries/${session.workspace.id}/${projectId}/git-${sourceKey}.zip`;
    await storage.putObject(storageKey, result.buffer, "application/zip");

    const expiresAt = new Date(
      Math.min(
        sourceExpiry.getTime(),
        Date.now() + context.retentionDays * 24 * 60 * 60 * 1000
      )
    );

    const [created] = await withTenant(
      { userId: session.user.id, workspaceId: session.workspace.id },
      (tx) =>
        tx
          .insert(deliveryGitArchives)
          .values({
            workspaceId: session.workspace.id,
            projectId,
            sourceVersionId: latestVersion?.id ?? null,
            storageKey,
            sha256: result.sha256,
            sizeBytes: result.sizeBytes,
            commitCount: result.commitCount,
            headCommit: result.headCommit,
            expiresAt,
          })
          .returning()
    );

    if (!created) {
      return NextResponse.json(
        { error: "Git archive was stored but its metadata could not be recorded." },
        { status: 500 }
      );
    }

    await withTenant(
      { userId: session.user.id, workspaceId: session.workspace.id },
      (tx) =>
        tx.insert(auditLog).values({
          workspaceId: session.workspace.id,
          userId: session.user.id,
          actorType: "user",
          action: "delivery.git_archive_created",
          resourceType: "delivery_git_archives",
          resourceId: created.id,
          metadata: {
            commitCount: result.commitCount,
            headCommit: result.headCommit,
            sourceVersionId: latestVersion?.id ?? null,
          },
        })
    );

    const url = await storage.getSignedDownloadUrl(created.storageKey, 300);

    return NextResponse.json({
      archiveId: created.id,
      url,
      commitCount: created.commitCount,
      headCommit: created.headCommit,
      sha256: created.sha256,
      sizeBytes: created.sizeBytes,
      expiresAt: created.expiresAt.toISOString(),
      reused: false,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Git archive generation failed.",
      },
      { status: 500 }
    );
  }
}
