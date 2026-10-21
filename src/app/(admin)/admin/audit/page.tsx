import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    redirect("/login");
  }

  const logs = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(50);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <Badge variant="outline" className="border-primary/40 text-primary text-sm">
          COMPLIANCE & SECURITY
        </Badge>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Platform Security Audit Log
        </h1>
        <p className="text-sm text-muted-foreground">
          Immutable audit trail recording authentication, artifact access, payment dispatches, and administrative actions.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="p-3 text-start font-semibold">Timestamp</th>
                  <th className="p-3 text-start font-semibold">Actor</th>
                  <th className="p-3 text-start font-semibold">Action</th>
                  <th className="p-3 text-start font-semibold">Resource</th>
                  <th className="p-3 text-start font-semibold">Resource ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="p-3 font-mono text-sm text-muted-foreground">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{l.actorType}</Badge>
                    </td>
                    <td className="p-3 font-mono text-foreground">{l.action}</td>
                    <td className="p-3 text-muted-foreground">{l.resourceType}</td>
                    <td className="p-3 font-mono text-sm">{l.resourceId ? `${l.resourceId.slice(0, 8)}...` : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
