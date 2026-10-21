import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { buildJobs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminJobsPage() {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    redirect("/login");
  }

  const jobs = await db
    .select()
    .from(buildJobs)
    .orderBy(desc(buildJobs.createdAt))
    .limit(50);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <Badge variant="outline" className="border-primary/40 text-primary text-sm">
          OPERATIONS FLEET
        </Badge>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Autonomous Build Jobs
        </h1>
        <p className="text-sm text-muted-foreground">
          Live inspection of gVisor sandbox build runs, iteration attempts, and parity metrics.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="p-3 text-start font-semibold">Job ID</th>
                  <th className="p-3 text-start font-semibold">Stage</th>
                  <th className="p-3 text-start font-semibold">Status</th>
                  <th className="p-3 text-start font-semibold">Parity Score</th>
                  <th className="p-3 text-start font-semibold">Attempt</th>
                  <th className="p-3 text-start font-semibold">Cost</th>
                  <th className="p-3 text-start font-semibold">Last Heartbeat</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="p-3 font-mono text-sm">{j.id.slice(0, 8)}...</td>
                    <td className="p-3 font-mono text-muted-foreground">{j.stage}</td>
                    <td className="p-3">
                      <Badge variant={j.status === "delivered" ? "default" : j.status === "build_failed" ? "destructive" : "secondary"}>
                        {j.status}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono">
                      {j.parityScore ? `${(j.parityScore * 100).toFixed(1)}%` : "N/A"}
                    </td>
                    <td className="p-3 font-mono">{j.attempt}</td>
                    <td className="p-3 font-mono">${((j.spentCents || 0) / 100).toFixed(2)}</td>
                    <td className="p-3 text-muted-foreground font-mono">
                      {j.heartbeatAt ? new Date(j.heartbeatAt).toLocaleTimeString() : "N/A"}
                    </td>
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
