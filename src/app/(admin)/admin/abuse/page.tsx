import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { systemDb } from "@/db";
import { abuseReports } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminAbusePage() {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    redirect("/login");
  }

  const reports = await systemDb
    .select()
    .from(abuseReports)
    .orderBy(desc(abuseReports.createdAt))
    .limit(50);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <Badge variant="outline" className="border-primary/40 text-primary text-sm">
          LEGAL & COMPLIANCE
        </Badge>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Abuse & DMCA Takedown Notices
        </h1>
        <p className="text-sm text-muted-foreground">
          Review incoming copyright takedown notices, malicious target reports, and contact inquiries.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No abuse or DMCA takedown reports logged.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="p-3 text-start font-semibold">Date</th>
                    <th className="p-3 text-start font-semibold">Reporter</th>
                    <th className="p-3 text-start font-semibold">Target / Reason</th>
                    <th className="p-3 text-start font-semibold">Details</th>
                    <th className="p-3 text-start font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                      <td className="p-3 text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 font-mono text-sm">{r.reporterEmail}</td>
                      <td className="p-3 font-semibold text-foreground">{r.reason}</td>
                      <td className="p-3 text-muted-foreground max-w-sm truncate">{r.details}</td>
                      <td className="p-3">
                        <Badge variant={r.status === "pending" ? "destructive" : "default"}>
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
