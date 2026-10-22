import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeStudio, StudioAuthError } from "@/lib/studio/authorize";
import { systemDb } from "@/db";
import { studioVersions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const downloadVersionId = searchParams.get("download");

  if (!projectId) {
    return NextResponse.json({ error: "projectId query parameter required" }, { status: 400 });
  }

  try {
    await authorizeStudio(projectId, session.user.id);

    if (downloadVersionId) {
      const [v] = await systemDb
        .select()
        .from(studioVersions)
        .where(eq(studioVersions.id, downloadVersionId));

      if (!v || v.projectId !== projectId) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }

      const downloadUrl = await storage.getSignedDownloadUrl(v.zipStorageKey, 300);
      return NextResponse.json({ downloadUrl, version: v });
    }

    const versions = await systemDb
      .select()
      .from(studioVersions)
      .where(eq(studioVersions.projectId, projectId))
      .orderBy(desc(studioVersions.versionNumber));

    return NextResponse.json({ versions });
  } catch (err: any) {
    const status = err instanceof StudioAuthError ? err.status : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
