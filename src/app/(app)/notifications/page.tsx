import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <Badge variant="outline" className="border-primary/40 text-primary text-sm">
          ALERTS & UPDATES
        </Badge>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Workspace Notifications
        </h1>
        <p className="text-sm text-muted-foreground">
          Recent build notifications, delivery dispatches, and verification milestones.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">All Caught Up</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            You do not have any unread notifications. Real-time updates for active builds stream directly into your project dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
