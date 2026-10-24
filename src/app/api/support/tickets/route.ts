import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupportTicket, listSupportTickets } from "@/lib/support/tickets";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CreateTicketSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  organization: z.string().max(100).optional(),
  inquiryType: z.string().min(1).max(50),
  message: z.string().min(5, "Message must be at least 5 characters").max(5000),
  honeypot: z.string().max(0, "Bot detected").optional(),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = CreateTicketSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.honeypot) {
      return NextResponse.json({ success: true, ticket: { id: "TICK-MOCK" } });
    }

    const ticket = await createSupportTicket({
      name: parsed.data.name,
      email: parsed.data.email,
      organization: parsed.data.organization,
      inquiryType: parsed.data.inquiryType,
      message: parsed.data.message,
    });

    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create support ticket" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const tickets = await listSupportTickets();
  return NextResponse.json({ tickets });
}
