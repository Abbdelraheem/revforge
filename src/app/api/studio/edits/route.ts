import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeStudio, StudioAuthError } from "@/lib/studio/authorize";
import { executeStudioEdit } from "@/lib/studio/worker";
import { systemDb } from "@/db";
import { studioEdits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "node:crypto";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId query parameter required" }, { status: 400 });
  }

  try {
    await authorizeStudio(projectId, session.user.id);
    const edits = await systemDb
      .select()
      .from(studioEdits)
      .where(eq(studioEdits.projectId, projectId))
      .orderBy(desc(studioEdits.createdAt));

    return NextResponse.json({ edits });
  } catch (err: any) {
    const status = err instanceof StudioAuthError ? err.status : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { projectId, prompt, maxCents = 200, parentVersionId } = body;

    if (!projectId || !prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "projectId and a non-empty prompt are required." },
        { status: 400 }
      );
    }

    // Authorize Studio access
    const auth = await authorizeStudio(projectId, session.user.id);

    // Create Studio Edit Record
    const editId = crypto.randomUUID();
    const [editRecord] = await systemDb
      .insert(studioEdits)
      .values({
        id: editId,
        projectId,
        workspaceId: auth.workspace.id,
        userId: session.user.id,
        parentVersionId: parentVersionId || auth.activeVersion?.id,
        promptRaw: prompt.trim(),
        tokensHeldCents: maxCents,
        status: "pending",
      })
      .returning();

    if (!editRecord) {
      return NextResponse.json({ error: "Failed to initialize studio edit record." }, { status: 500 });
    }

    // Execute edit
    const result = await executeStudioEdit({
      editId: editRecord.id,
      projectId,
      workspaceId: auth.workspace.id,
      userId: session.user.id,
      parentVersionId: parentVersionId || auth.activeVersion?.id,
      rawPrompt: prompt.trim(),
      maxCents,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.failureReason || "Studio edit failed", editId: result.editId },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      editId: result.editId,
      versionId: result.versionId,
      versionNumber: result.versionNumber,
      tokensSettledCents: result.tokensSettledCents,
    });
  } catch (err: any) {
    const status = err instanceof StudioAuthError ? err.status : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
