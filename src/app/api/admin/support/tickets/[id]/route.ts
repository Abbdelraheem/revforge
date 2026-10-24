import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { updateSupportTicket, getSupportTicket } from "@/lib/support/tickets";

export const dynamic = "force-dynamic";

const UpdateTicketSchema = z.object({
  status: z.enum(["open", "replied", "closed"]).optional(),
  reply: z.string().max(5000).optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;
  const raw = await req.json().catch(() => ({}));
  const parsed = UpdateTicketSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const ticket = await getSupportTicket(id);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const updated = await updateSupportTicket(id, parsed.data);
  return NextResponse.json({ success: true, ticket: updated });
}
