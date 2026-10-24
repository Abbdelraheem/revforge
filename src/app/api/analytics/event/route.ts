import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordFunnelEvent, FunnelStage } from "@/lib/analytics/funnel";

export const dynamic = "force-dynamic";

const EventSchema = z.object({
  stage: z.enum([
    "visit",
    "analysis_started",
    "report_viewed",
    "quote_generated",
    "paid",
    "delivered",
    "studio_edit",
    "repurchase",
  ]),
  anonymousId: z.string().max(100).optional(),
  workspaceId: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = EventSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
    }

    const event = await recordFunnelEvent(parsed.data.stage as FunnelStage, {
      anonymousId: parsed.data.anonymousId,
      workspaceId: parsed.data.workspaceId,
      metadata: parsed.data.metadata,
    });

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to record event" },
      { status: 500 }
    );
  }
}
