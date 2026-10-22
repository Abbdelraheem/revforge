import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { authorizeStudio, StudioAuthError } from "@/lib/studio/authorize";
import { systemDb } from "@/db";
import { studioVersions, studioEdits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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

  let authResult;
  try {
    authResult = await authorizeStudio(projectId, session.user.id);
  } catch (err: any) {
    if (err instanceof StudioAuthError) {
      if (err.status === 404) {
        notFound();
      }
      redirect(`/projects/${projectId}?studio_error=${encodeURIComponent(err.message)}`);
    }
    redirect(`/projects/${projectId}?studio_error=${encodeURIComponent("Failed to load Studio.")}`);
  }

  const versions = await systemDb
    .select()
    .from(studioVersions)
    .where(eq(studioVersions.projectId, projectId))
    .orderBy(desc(studioVersions.versionNumber));

  const edits = await systemDb
    .select()
    .from(studioEdits)
    .where(eq(studioEdits.projectId, projectId))
    .orderBy(desc(studioEdits.createdAt));

  const serializedVersions = versions.map((v) => ({
    id: v.id,
    versionNumber: v.versionNumber,
    label: v.label,
    zipStorageKey: v.zipStorageKey,
    previewUrl: v.previewUrl,
    parityScore: v.parityScore,
    filesManifest: v.filesManifest,
    createdAt: v.createdAt.toISOString(),
  }));

  const serializedEdits = edits.map((e) => ({
    id: e.id,
    promptRaw: e.promptRaw,
    promptEnhanced: e.promptEnhanced,
    status: e.status,
    tokensHeldCents: e.tokensHeldCents,
    tokensSettledCents: e.tokensSettledCents,
    diffStat: e.diffStat,
    failureReason: e.failureReason,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <StudioClient
      projectId={projectId}
      projectName={authResult.project.name}
      initialVersions={serializedVersions}
      initialEdits={serializedEdits}
      initialBalanceCents={authResult.balanceCents}
    />
  );
}
