import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listSupportTickets, CANNED_REPLIES } from "@/lib/support/tickets";
import { Badge } from "@/components/ui/badge";
import { AdminSupportClient } from "./support-client";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    redirect("/login");
  }

  const tickets = await listSupportTickets();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <Badge variant="outline" className="border-primary/40 text-primary text-sm">
          CUSTOMER OPERATIONS &amp; SUPPORT
        </Badge>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Support Inbox &amp; Tickets
        </h1>
        <p className="text-sm text-muted-foreground">
          Track customer inquiries, respond with verified canned playbooks, and manage resolution state.
        </p>
      </div>

      <AdminSupportClient initialTickets={tickets} cannedReplies={CANNED_REPLIES} />
    </div>
  );
}
