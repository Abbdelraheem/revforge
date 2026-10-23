import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeStudio } from "@/lib/studio/authorize";
import { loadStudioRouteData } from "@/lib/studio/route-context";
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
    return NextResponse.json(
      { error: "projectId query parameter required" },
      { status: 400 }
    );
  }

  try {
    const data = await loadStudioRouteData(session, projectId);
    const auth = authorizeStudio({
      session,
      project: data.project,
      orders: data.orders,
      balanceCents: data.balanceCents,
    });

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (downloadVersionId) {
      const version = data.versions.find((item) => item.id === downloadVersionId);

      if (!version) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }

      const downloadUrl = await storage.getSignedDownloadUrl(
        version.zipStorageKey,
        300
      );
      return NextResponse.json({ downloadUrl, version });
    }

    return NextResponse.json({ versions: data.versions });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load Studio versions." },
      { status: 500 }
    );
  }
}
