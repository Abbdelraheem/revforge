import React from "react";
import { checkSystemHealth, HealthReport } from "@/lib/health/probe";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/config/brand";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  let health: HealthReport = {
    status: "down",
    services: {
      postgres: false,
      postgresSystem: false,
      redis: false,
      s3: false,
      docker: false,
      worker: false,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    health = await checkSystemHealth();
  } catch {
    // Graceful fallback if probe throws
  }

  const isOperational = health.status === "healthy";
  const isDegraded = health.status === "degraded";

  const serviceList = [
    { name: "PostgreSQL (App Role)", key: "postgres", ok: health.services.postgres },
    { name: "PostgreSQL (System Role)", key: "postgresSystem", ok: health.services.postgresSystem },
    { name: "Redis 7 (BullMQ & Outbox)", key: "redis", ok: health.services.redis },
    { name: "S3 Object Storage", key: "s3", ok: health.services.s3 },
    { name: "Container Isolation Runtime", key: "docker", ok: health.services.docker },
    { name: "Active Worker Pool", key: "worker", ok: health.services.worker },
  ];

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
            Live operational telemetry across {BRAND.name} Postgres databases, Redis queues, S3 storage, and sandboxed compilation workers.
          </p>
        </div>

        {/* Global Banner */}
        <div
          className={`p-4 rounded-lg border flex items-center justify-between ${
            isOperational
              ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-800"
              : isDegraded
              ? "border-amber-600/30 bg-amber-500/10 text-amber-800"
              : "border-red-600/30 bg-red-500/10 text-red-800"
          }`}
        >
          <div className="flex items-center space-x-3">
            <span
              className={`h-3 w-3 rounded-full ${
                isOperational ? "bg-emerald-600" : isDegraded ? "bg-amber-600" : "bg-red-600"
              }`}
            />
            <span className="font-semibold text-sm">
              {isOperational
                ? "All Core Systems Operational"
                : isDegraded
                ? "System Degraded — Background Worker or Sandbox Idle"
                : "System Outage — Core Infrastructure Unreachable"}
            </span>
          </div>
          <span className="font-mono text-sm text-muted-foreground">
            {health.timestamp}
          </span>
        </div>

        {/* Services Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceList.map((svc) => (
            <Card key={svc.key} className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-serif">{svc.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={svc.ok ? "default" : "destructive"}>
                    {svc.ok ? "Operational" : "Unavailable"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Heartbeat:</span>
                  <span className="font-mono">{svc.ok ? "Passing" : "No Signal"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
