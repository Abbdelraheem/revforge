import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSession } from "@/lib/auth";
import { authorizeStudio } from "@/lib/studio/authorize";
import { loadStudioRouteData } from "@/lib/studio/route-context";
import { executeStudioEdit } from "@/lib/studio/worker";
import { studioEdits } from "@/db/schema";
import { withTenant } from "@/db/tenant";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
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

    return NextResponse.json({ edits: data.edits });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load Studio edits." },
      { status: 500 }
    );
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

    if (!Number.isFinite(maxCents) || Number(maxCents) <= 0) {
      return NextResponse.json(
        { error: "maxCents must be a positive integer." },
        { status: 400 }
      );
    }

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

    const parentVersionIdValue =
      parentVersionId || data.versions[0]?.id || undefined;

    // Create the edit row inside the tenant transaction.
    const editRecord = await withTenant(
      { userId: session.user.id, workspaceId: session.workspace.id },
      async (tx) => {
        const [created] = await tx
          .insert(studioEdits)
          .values({
            id: crypto.randomUUID(),
            projectId,
            workspaceId: session.workspace.id,
            userId: session.user.id,
            parentVersionId: parentVersionIdValue,
            promptRaw: prompt.trim(),
            tokensHeldCents: Math.floor(Number(maxCents)),
            status: "pending",
          })
          .returning();

        return created;
      }
    );

    if (!editRecord) {
      return NextResponse.json(
        { error: "Failed to initialize studio edit record." },
        { status: 500 }
      );
    }

    const result = await executeStudioEdit({
      editId: editRecord.id,
      projectId,
      workspaceId: session.workspace.id,
      userId: session.user.id,
      parentVersionId: parentVersionIdValue,
      rawPrompt: prompt.trim(),
      maxCents: Math.floor(Number(maxCents)),
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error:
            result.failureReason || "Studio edit did not produce an accepted version.",
          editId: result.editId,
          outcome: result.outcome,
          ...(result.clarification ? { clarification: result.clarification } : {}),
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      editId: result.editId,
      versionId: result.versionId,
      versionNumber: result.versionNumber,
      tokensSettledCents: result.tokensSettledCents,
      outcome: result.outcome,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Studio edit execution failed." },
      { status: 500 }
    );
  }
}
