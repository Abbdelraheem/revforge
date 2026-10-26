import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  isExpired,
  loadDeliveryContext,
  versionExpiresAt,
} from "@/lib/delivery/context";
import { authorizeDownload } from "@/lib/delivery/authorize";
import { buildDeployGuide } from "@/lib/delivery/deploy-guide";
import { env } from "@/env";
import { DeliveryClient } from "./delivery-client";

export const dynamic = "force-dynamic";

interface DeliveryPageProps {
  params: Promise<{ id: string }>;
}

export default async function DeliveryPage({ params }: DeliveryPageProps) {
  const { id: projectId } = await params;
  const session = await getSession();
  if (!session) {
    redirect(`/login?callbackUrl=/projects/${projectId}/delivery`);
  }

  const context = await loadDeliveryContext(session, projectId);
  if (!context) notFound();

  const auth = authorizeDownload({
    session,
    project: context.project,
    orders: context.orders,
    delivery: context.delivery,
    now: Date.now(),
  });

  const latestVersion = context.versions[0] || null;
  const latestVersionExpiresAt = latestVersion
    ? versionExpiresAt(latestVersion, context.retentionDays)
    : null;
  const deliveryExpiresAt = latestVersionExpiresAt || context.delivery?.expiresAt || null;
  const expired = deliveryExpiresAt ? isExpired(deliveryExpiresAt) : false;
  const downloadHref = latestVersion
    ? `/api/download/${projectId}?versionId=${latestVersion.id}`
    : `/api/download/${projectId}`;

  return (
    <DeliveryClient
      projectId={projectId}
      projectName={context.project.name}
      projectStatus={context.project.status}
      access={{ ok: auth.ok, status: auth.status, error: auth.error || null }}
      delivery={
        context.delivery
          ? {
              sha256: context.delivery.sha256,
              sizeBytes: context.delivery.sizeBytes,
              status: context.delivery.status,
              createdAt: context.delivery.createdAt.toISOString(),
              expiresAt: context.delivery.expiresAt.toISOString(),
            }
          : null
      }
      latestVersion={
        latestVersion
          ? {
              id: latestVersion.id,
              versionNumber: latestVersion.versionNumber,
              label: latestVersion.label,
              parityScore: latestVersion.parityScore,
              fileCount: latestVersion.filesManifest.length,
              createdAt: latestVersion.createdAt.toISOString(),
              expiresAt: latestVersionExpiresAt!.toISOString(),
            }
          : null
      }
      versions={context.versions.map((version) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        label: version.label,
        parityScore: version.parityScore,
        fileCount: version.filesManifest.length,
        createdAt: version.createdAt.toISOString(),
        expiresAt: versionExpiresAt(
          version,
          context.retentionDays
        ).toISOString(),
      }))}
      gitArchives={context.gitArchives.map((archive) => ({
        id: archive.id,
        commitCount: archive.commitCount,
        headCommit: archive.headCommit,
        sha256: archive.sha256,
        sizeBytes: archive.sizeBytes,
        createdAt: archive.createdAt.toISOString(),
        expiresAt: archive.expiresAt.toISOString(),
        sourceVersionId: archive.sourceVersionId,
      }))}
      retentionDays={context.retentionDays}
      expired={expired}
      deliveryExpiresAt={deliveryExpiresAt?.toISOString() || null}
      downloadHref={downloadHref}
      githubEnabled={env.ENABLE_GITHUB_PUSH}
      githubTokenConfigured={Boolean(env.GITHUB_TOKEN)}
      recipientEmail={context.ownerEmail || session.user.email}
      deployGuide={buildDeployGuide()}
      review={context.review || null}
    />
  );
}
