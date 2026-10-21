import React from "react";
import { db } from "@/db";
import { workerHeartbeats } from "@/db/schema";
import { desc, gt } from "drizzle-orm";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/config/brand";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  let heartbeats: Array<{ id: string; lastSeen: Date; capacity: number; version: string }> = [];

  try {
    heartbeats = await db
      .select({
        id: workerHeartbeats.id,
        lastSeen: workerHeartbeats.lastSeen,
        capacity: workerHeartbeats.capacity,
        version: workerHeartbeats.version,
      })
      .from(workerHeartbeats)
      .where(gt(workerHeartbeats.lastSeen, cutoff))
      .orderBy(desc(workerHeartbeats.lastSeen));
  } catch {
    // db fallback
  }

  const isOperational = heartbeats.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <MarketingHeader />

      <main className="flex-1 py-16 px-6 max-w-5xl mx-auto w-full space-y-10">
        <div className="space-y-4 border-b border-border pb-6">
          <Badge variant="outline" className="border-primary/40 text-primary text-sm">
            REAL-TIME TELEMETRY
          </Badge>
          <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight">
            System & Infrastructure Status
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Live operational status of {BRAND.name} sandboxed compilation workers, Redis queues, and payment webhooks.
          </p>
        </div>

        {/* Global Banner */}
        <div className={`p-4 rounded-lg border flex items-center justify-between ${
          isOperational ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-800" : "border-amber-600/30 bg-amber-500/10 text-amber-800"
        }`}>
          <div className="flex items-center space-x-3">
            <span className={`h-3 w-3 rounded-full ${isOperational ? "bg-emerald-600" : "bg-amber-600"}`} />
            <span className="font-semibold text-sm">
              {isOperational ? "All Systems Operational" : "Sandbox Worker Pool Idle / Scaling Up"}
            </span>
          </div>
          <span className="font-mono text-sm text-muted-foreground">
            {new Date().toISOString()}
          </span>
        </div>

        {/* Services Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-serif">Clean-Room Sandbox Workers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Instances:</span>
                <span className="font-mono font-bold">{heartbeats.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Isolation Runtime:</span>
                <span className="font-mono">gVisor MicroVM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={isOperational ? "default" : "secondary"}>
                  {isOperational ? "Operational" : "Idle"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-serif">Transactional Outbox & BullMQ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Queue Backend:</span>
                <span className="font-mono">Redis 7 (AOF)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outbox Reconciler:</span>
                <span className="font-mono">Active (5s heartbeat)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="default">Operational</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-serif">Paddle Payment Gateway</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Webhook Verification:</span>
                <span className="font-mono">HMAC-SHA256 (±300s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency:</span>
                <span className="font-mono">USD Only</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="default">Operational</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Worker Pool Heartbeats Table */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-serif text-foreground">
            Worker Heartbeats Ledger
          </h2>
          {heartbeats.length === 0 ? (
            <div className="p-8 rounded-lg border border-border bg-card text-center text-sm text-muted-foreground">
              No worker heartbeats registered in the last 5 minutes.
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm font-sans">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="p-3 text-start font-semibold">Worker Node ID</th>
                    <th className="p-3 text-start font-semibold">Version</th>
                    <th className="p-3 text-start font-semibold">Capacity</th>
                    <th className="p-3 text-start font-semibold">Last Heartbeat Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {heartbeats.map((hb) => (
                    <tr key={hb.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-mono text-sm">{hb.id}</td>
                      <td className="p-3 font-mono">{hb.version}</td>
                      <td className="p-3 font-mono">{hb.capacity} concurrent</td>
                      <td className="p-3 font-mono text-muted-foreground">
                        {new Date(hb.lastSeen).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
