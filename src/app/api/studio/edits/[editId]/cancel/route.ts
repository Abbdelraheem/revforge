import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { withTenant } from "@/db/tenant";
import { creditsLedger, studioEdits } from "@/db/schema";
import { releaseCredits } from "@/lib/studio/credits";

export const runtime = "nodejs";

const ACTIVE_STATUSES = [
  "pending",
  "enhancing",
  "held",
  "applying",
  "verifying",
] as const;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ editId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { editId } = await params;

  const result = await withTenant(
    { userId: session.user.id, workspaceId: session.workspace.id },
    async (tx) => {
      const [edit] = await tx
        .select()
        .from(studioEdits)
        .where(
          and(
            eq(studioEdits.id, editId),
            eq(studioEdits.workspaceId, session.workspace.id)
          )
        )
        .for("update");

      if (!edit) return { kind: "not_found" as const };
      if (edit.status === "committed") return { kind: "committed" as const };
      if (!ACTIVE_STATUSES.includes(edit.status as (typeof ACTIVE_STATUSES)[number])) {
        return {
          kind: "terminal" as const,
          status: edit.status,
          releasedCents: 0,
        };
      }

      const [hold] = await tx
        .select({ id: creditsLedger.id, deltaCents: creditsLedger.deltaCents })
        .from(creditsLedger)
        .where(
          and(
            eq(creditsLedger.workspaceId, session.workspace.id),
            eq(creditsLedger.reason, `studio_hold:${editId}`)
          )
        )
        .limit(1);

      let releasedCents = 0;
      if (hold) {
        const released = await releaseCredits(tx, {
          workspaceId: session.workspace.id,
          editId,
          heldCents: Math.abs(hold.deltaCents),
        });
        releasedCents = released.releasedCents;
      }

      await tx
        .update(studioEdits)
        .set({
          cancelRequested: true,
          status: "refunded",
          tokensSettledCents: 0,
          failureReason:
            "Canceled by the user. The full held amount was released; no partial charge was settled.",
          finishedAt: new Date(),
        })
        .where(eq(studioEdits.id, editId));

      return { kind: "canceled" as const, releasedCents };
    }
  );

  if (result.kind === "not_found") {
    return NextResponse.json({ error: "Edit not found." }, { status: 404 });
  }
  if (result.kind === "committed") {
    return NextResponse.json(
      { error: "This edit is already committed and cannot be canceled." },
      { status: 409 }
    );
  }
  if (result.kind === "terminal") {
    return NextResponse.json({
      canceled: false,
      status: result.status,
      releasedCents: 0,
      message: "This edit already reached a terminal state.",
    });
  }

  return NextResponse.json({
    canceled: true,
    releasedCents: result.releasedCents,
    status: "refunded",
  });
}
