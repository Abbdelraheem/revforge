import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { withTenant } from "@/db/tenant";
import { notifications } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const items = await withTenant(
    { userId: session.user.id, workspaceId: session.workspace.id },
    (tx) =>
      tx
        .select({
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          body: notifications.body,
          read: notifications.read,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(
          and(
            eq(notifications.workspaceId, session.workspace.id),
            eq(notifications.userId, session.user.id)
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(50)
  );

  const unread = items.filter((item) => !item.read).length;

  return (
    <div className="mx-auto max-w-4xl space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">ALERTS &amp; UPDATES
        </p>
        <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
          Workspace Notifications
        </h1>
        <p className="text-sm text-muted-foreground">
          Persisted build, delivery, and verification notifications for your account.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="space-y-3 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bell className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-foreground">No notification rows</h2>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                No persisted notifications exist for this account. Build updates also stream into
                active project pages while a job is running.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  {items.length} notification{items.length === 1 ? "" : "s"}
                </p>
                <Badge variant={unread > 0 ? "default" : "secondary"}>
                  {unread} unread
                </Badge>
              </div>
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id} className="space-y-1 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {item.read ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        )}
                        <div>
                          <p className="font-semibold text-foreground">{item.title}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {item.type}
                        </Badge>
                        <span className="font-mono text-sm text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
