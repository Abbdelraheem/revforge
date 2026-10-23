import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { systemDb } from "@/db";
import { buildJobs, workerHeartbeats } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminJobsPage() {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    redirect("/login");
  }

  // 1. All recent jobs
  const jobs = await systemDb
    .select()
    .from(buildJobs)
    .orderBy(desc(buildJobs.createdAt))
    .limit(50);

  // 2. Dead-letter queue / Poison jobs
  const dlqJobs = jobs.filter((j) => j.status === "build_failed");

  // 3. Worker fleet telemetry
  const workers = await systemDb
    .select()
    .from(workerHeartbeats)
    .orderBy(desc(workerHeartbeats.lastSeen));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <Badge variant="outline" className="border-primary/40 text-primary text-sm">
          OPERATIONS FLEET
        </Badge>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Autonomous Build Jobs & Dead-Letter Queue
        </h1>
        <p className="text-sm text-muted-foreground">
          Live inspection of sandboxed compilation jobs, lease heartbeats, and dead-letter recovery.
        </p>
      </div>

      {/* Worker Fleet Telemetry */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg font-serif">Worker Daemon Fleet Heartbeats</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="p-3 text-start font-semibold">Worker Node ID</th>
                  <th className="p-3 text-start font-semibold">Version</th>
                  <th className="p-3 text-start font-semibold">Concurrency Capacity</th>
                  <th className="p-3 text-start font-semibold">Status</th>
                  <th className="p-3 text-start font-semibold">Last Heartbeat</th>
                </tr>
              </thead>
              <tbody>
                {workers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-sm text-muted-foreground">
                      No active workers reporting heartbeats. Jobs will remain queued until workers start.
                    </td>
                  </tr>
                ) : (
                  workers.map((w) => {
                    const isAlive = Date.now() - new Date(w.lastSeen).getTime() < 30_000;
                    return (
                      <tr key={w.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                        <td className="p-3 font-mono font-medium">{w.id}</td>
                        <td className="p-3 font-mono text-muted-foreground">{w.version}</td>
                        <td className="p-3 font-mono">{w.capacity} concurrent jobs</td>
                        <td className="p-3">
                          <Badge variant={isAlive ? "default" : "destructive"} className="text-sm">
                            {isAlive ? "ONLINE" : "STALE / UNRESPONSIVE"}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground font-mono">
                          {new Date(w.lastSeen).toLocaleTimeString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dead-Letter Queue Section */}
      <Card className="border-red-600/30 bg-card shadow-sm">
        <CardHeader className="border-b border-border bg-red-500/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-serif text-red-700">
              Dead-Letter Queue (DLQ) & Poison Jobs ({dlqJobs.length})
            </CardTitle>
            <Badge variant="outline" className="border-red-600/40 text-red-600 text-sm">
              TERMINAL FAILS
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="p-3 text-start font-semibold">Job ID</th>
                  <th className="p-3 text-start font-semibold">Terminal Error</th>
                  <th className="p-3 text-start font-semibold">Attempts</th>
                  <th className="p-3 text-start font-semibold">Spent</th>
                  <th className="p-3 text-start font-semibold">Updated</th>
                  <th className="p-3 text-end font-semibold">Operator Actions</th>
                </tr>
              </thead>
              <tbody>
                {dlqJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-sm text-muted-foreground">
                      No poison or dead-letter jobs. System reliability is 100%.
                    </td>
                  </tr>
                ) : (
                  dlqJobs.map((j) => (
                    <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                      <td className="p-3 font-mono font-medium">{j.id.slice(0, 8)}...</td>
                      <td className="p-3 font-mono text-destructive max-w-xs truncate" title={j.error || "Unknown"}>
                        {j.error || "No error string recorded"}
                      </td>
                      <td className="p-3 font-mono">{j.attempt}</td>
                      <td className="p-3 font-mono">${((j.spentCents || 0) / 100).toFixed(2)}</td>
                      <td className="p-3 text-muted-foreground font-mono">
                        {new Date(j.updatedAt).toLocaleTimeString()}
                      </td>
                      <td className="p-3 text-end space-x-2">
                        <form action={`/api/admin/jobs/${j.id}`} method="POST" className="inline-block">
                          <input type="hidden" name="action" value="retry" />
                          <Button size="sm" variant="outline" className="text-sm">
                            Retry
                          </Button>
                        </form>
                        <form action={`/api/admin/jobs/${j.id}`} method="POST" className="inline-block">
                          <input type="hidden" name="action" value="refund" />
                          <Button size="sm" variant="secondary" className="text-sm">
                            Refund
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* All Recent Jobs */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg font-serif">All Build Jobs History</CardTitle>
        </CardHeader>
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
                  <th className="p-3 text-start font-semibold">Heartbeat</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="p-3 font-mono font-medium">{j.id.slice(0, 8)}...</td>
                    <td className="p-3 font-mono text-muted-foreground">{j.stage}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          j.status === "delivered"
                            ? "default"
                            : j.status === "build_failed"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-sm"
                      >
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
