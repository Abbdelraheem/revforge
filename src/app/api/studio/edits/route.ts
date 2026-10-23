import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { authorizeStudio } from "@/lib/studio/authorize";
import { loadStudioRouteData } from "@/lib/studio/route-context";
import { executeStudioEdit } from "@/lib/studio/worker";
import { projects, studioEdits } from "@/db/schema";
import { withTenant } from "@/db/tenant";
import { getPrompt } from "@/lib/prompts";

export const runtime = "nodejs";

const ACTIVE_EDIT_STATUSES = [
  "pending",
  "enhancing",
  "held",
  "applying",
  "verifying",
] as const;

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

    return NextResponse.json({
      edits: data.edits,
      balanceCents: data.balanceCents,
      activeEdit:
        data.edits.find((edit) =>
          ACTIVE_EDIT_STATUSES.includes(
            edit.status as (typeof ACTIVE_EDIT_STATUSES)[number]
          )
        ) ?? null,
    });
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

    const holdCents = Math.floor(Number(maxCents));

    // This is a real balance read, not a client-side estimate. A concurrent
    // spend can still win the advisory lock later; the stream reports that
    // failure and the worker releases the hold.
    if (data.balanceCents < holdCents) {
      return NextResponse.json(
        {
          error: "Not enough Studio tokens for the maximum charge you selected.",
          code: "insufficient_tokens",
          balanceCents: data.balanceCents,
          requiredCents: holdCents,
          purchaseUrl: `/billing?projectId=${encodeURIComponent(projectId)}`,
        },
        { status: 402 }
      );
    }

    const parentVersionIdValue =
      parentVersionId || data.versions[0]?.id || undefined;

    // Locking the project row serializes the active-edit check with edit
    // creation, so two tabs cannot both pass the check and start.
    const creation = await withTenant(
      { userId: session.user.id, workspaceId: session.workspace.id },
      async (tx) => {
        const [project] = await tx
          .select({ id: projects.id })
          .from(projects)
          .where(
            and(
              eq(projects.id, projectId),
              eq(projects.workspaceId, session.workspace.id)
            )
          )
          .for("update");

        if (!project) return { kind: "missing" as const };

        const [active] = await tx
          .select({
            id: studioEdits.id,
            status: studioEdits.status,
            promptRaw: studioEdits.promptRaw,
          })
          .from(studioEdits)
          .where(
            and(
              eq(studioEdits.projectId, projectId),
              eq(studioEdits.workspaceId, session.workspace.id),
              inArray(studioEdits.status, [...ACTIVE_EDIT_STATUSES])
            )
          )
          .limit(1);

        if (active) return { kind: "conflict" as const, active };

        const [created] = await tx
          .insert(studioEdits)
          .values({
            id: crypto.randomUUID(),
            projectId,
            workspaceId: session.workspace.id,
            userId: session.user.id,
            parentVersionId: parentVersionIdValue,
            promptRaw: prompt.trim(),
            tokensHeldCents: holdCents,
            promptVersion: getPrompt("edit_planner").version,
            status: "pending",
          })
          .returning();

        return { kind: "created" as const, edit: created };
      }
    );

    if (creation.kind === "missing") {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (creation.kind === "conflict") {
      return NextResponse.json(
        {
          error:
            "Another Studio edit is already running for this project. Wait for it to finish or cancel it.",
          code: "edit_in_progress",
          activeEditId: creation.active.id,
          activeStatus: creation.active.status,
        },
        { status: 409 }
      );
    }

    if (!creation.edit) {
      return NextResponse.json(
        { error: "Failed to initialize studio edit record." },
        { status: 500 }
      );
    }

    const editRecord = creation.edit;

    // The edit runs in this Node process. The response is sent immediately so
    // the browser can attach to the real status stream; there is no simulated
    // progress. If the process dies, the row remains non-terminal and the UI
    // says so rather than pretending an edit is still running.
    void executeStudioEdit({
      editId: editRecord.id,
      projectId,
      workspaceId: session.workspace.id,
      userId: session.user.id,
      parentVersionId: parentVersionIdValue,
      rawPrompt: prompt.trim(),
      maxCents: holdCents,
    }).catch(async (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Studio edit worker failed.";
      try {
        await withTenant(
          { userId: session.user.id, workspaceId: session.workspace.id },
          (tx) =>
            tx
              .update(studioEdits)
              .set({
                status: "failed",
                failureReason: message,
                finishedAt: new Date(),
              })
              .where(eq(studioEdits.id, editRecord.id))
        );
      } catch {
        // The stream will keep reporting the last persisted state.
      }
    });

    return NextResponse.json(
      {
        success: true,
        accepted: true,
        editId: editRecord.id,
        status: "pending",
        streamUrl: `/api/studio/edits/${editRecord.id}/events`,
      },
      { status: 202 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Studio edit execution failed." },
      { status: 500 }
    );
  }
}
