"use client";

import React, { useState } from "react";
import { SupportTicket } from "@/lib/support/tickets";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, Clock, Copy, Check, MessageSquare, Inbox } from "lucide-react";

interface Props {
  initialTickets: SupportTicket[];
  cannedReplies: Array<{ id: string; title: string; body: string }>;
}

export function AdminSupportClient({ initialTickets, cannedReplies }: Props) {
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    initialTickets[0] || null
  );
  const [replyText, setReplyText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateStatus = async (
    ticketId: string,
    status: "open" | "replied" | "closed",
    reply?: string
  ) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reply }),
      });
      const data = await res.json();
      if (res.ok && data.ticket) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? data.ticket : t))
        );
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(data.ticket);
        }
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tickets List */}
      <Card className="border-border bg-card shadow-sm lg:col-span-1">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-serif flex items-center justify-between">
            <span>Incoming Inquiries</span>
            <Badge variant="outline" className="font-mono text-sm">
              {tickets.length} Total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 max-h-[600px] overflow-y-auto divide-y divide-border">
          {tickets.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Inbox className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No support tickets found</p>
                <p className="text-sm text-muted-foreground">
                  The inbox is clear. Incoming customer support tickets will appear here.
                </p>
              </div>
            </div>
          ) : (
            tickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedTicket(t);
                    setReplyText(t.reply || "");
                  }}
                  className={`w-full text-start p-4 transition-colors ${
                    isSelected ? "bg-muted/40" : "hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-foreground truncate">
                      {t.id}
                    </span>
                    <Badge
                      variant={
                        t.status === "open"
                          ? "default"
                          : t.status === "replied"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-sm font-mono capitalize"
                    >
                      {t.status}
                    </Badge>
                  </div>
                  <div className="text-sm font-semibold text-foreground truncate">
                    {t.name} ({t.email})
                  </div>
                  <div className="text-sm text-muted-foreground truncate mt-0.5">
                    {t.inquiryType}
                  </div>
                  <div className="text-sm text-muted-foreground font-mono mt-1">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Ticket Details & Action Panel */}
      <div className="lg:col-span-2 space-y-6">
        {selectedTicket ? (
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <Badge variant="outline" className="font-mono text-sm text-primary mb-1">
                    {selectedTicket.id}
                  </Badge>
                  <CardTitle className="text-xl font-serif">
                    {selectedTicket.inquiryType}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    From {selectedTicket.name} &bull; {selectedTicket.email}
                    {selectedTicket.organization && ` &bull; ${selectedTicket.organization}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() =>
                      handleUpdateStatus(
                        selectedTicket.id,
                        selectedTicket.status === "closed" ? "open" : "closed"
                      )
                    }
                    className="text-sm font-semibold"
                  >
                    {selectedTicket.status === "closed" ? "Reopen" : "Close Ticket"}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Message body */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Customer Message</label>
                <div className="p-4 rounded border border-border bg-muted/10 text-sm whitespace-pre-wrap font-sans text-foreground">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Canned Replies Palette */}
              <div className="space-y-2 border-t border-border pt-4">
                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span>Insert Canned Response</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cannedReplies.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded border border-border bg-background hover:border-primary/50 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="font-bold text-sm text-foreground">{c.title}</div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {c.body}
                        </p>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReplyText(c.body)}
                          className="text-sm h-7 px-2"
                        >
                          Use in reply
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(c.body, c.id)}
                          className="text-sm h-7 px-2"
                        >
                          {copiedId === c.id ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reply field */}
              <div className="space-y-2 border-t border-border pt-4">
                <label className="text-sm font-semibold text-foreground">Dispatch Reply</label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Draft response to customer..."
                  className="w-full rounded border border-input bg-background p-3 text-sm font-sans shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    size="sm"
                    disabled={isUpdating || !replyText.trim()}
                    onClick={() =>
                      handleUpdateStatus(selectedTicket.id, "replied", replyText)
                    }
                    className="text-sm font-semibold"
                  >
                    Record Reply &amp; Mark Replied
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card shadow-sm p-12 text-center text-muted-foreground text-sm">
            Select a ticket from the left panel to review message and dispatch canned responses.
          </Card>
        )}
      </div>
    </div>
  );
}
