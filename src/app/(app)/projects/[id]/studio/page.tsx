import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { authorizeStudio } from "@/lib/studio/authorize";
import { loadStudioRouteData } from "@/lib/studio/route-context";
import { StudioClient } from "./studio-client";

export const dynamic = "force-dynamic";

interface StudioPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { id: projectId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?callbackUrl=/projects/${projectId}/studio`);
  }

  const data = await loadStudioRouteData(session, projectId);
  const auth = authorizeStudio({
    session,
    project: data.project,
    orders: data.orders,
    balanceCents: data.balanceCents,
  });

  if (!auth.ok) {
    if (auth.status === 404) {
      notFound();
    }
    redirect(
      `/projects/${projectId}?studio_error=${encodeURIComponent(
        auth.error || "Studio access denied."
      )}`
    );
  }

  const serializedVersions = data.versions.map((version) => ({
    id: version.id,
    versionNumber: version.versionNumber,
    label: version.label,
    zipStorageKey: version.zipStorageKey,
    previewUrl: version.previewUrl,
    parityScore: version.parityScore,
    filesManifest: version.filesManifest,
    createdAt: version.createdAt.toISOString(),
  }));

  const serializedEdits = data.edits.map((edit) => ({
    id: edit.id,
    promptRaw: edit.promptRaw,
    promptEnhanced: edit.promptEnhanced,
    status: edit.status,
    tokensHeldCents: edit.tokensHeldCents,
    tokensSettledCents: edit.tokensSettledCents,
    diffStat: edit.diffStat,
    failureReason: edit.failureReason,
    createdAt: edit.createdAt.toISOString(),
  }));

  return (
    <StudioClient
      projectId={projectId}
      projectName={data.project!.name}
      initialVersions={serializedVersions}
      initialEdits={serializedEdits}
      initialBalanceCents={auth.balanceCents ?? 0}
    />
  );
}
