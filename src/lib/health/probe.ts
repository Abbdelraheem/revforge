import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sql, gt } from "drizzle-orm";
import { ListBucketsCommand } from "@aws-sdk/client-s3";
import { db, systemDb } from "@/db";
import { workerHeartbeats } from "@/db/schema";
import { getRedisConnection } from "@/lib/queue/queues";
import { s3Client } from "@/lib/storage";

const execFileAsync = promisify(execFile);

export interface HealthServicesStatus {
  postgres: boolean;
  postgresSystem: boolean;
  redis: boolean;
  s3: boolean;
  docker: boolean;
  worker: boolean;
}

export interface HealthReport {
  status: "healthy" | "degraded" | "down";
  services: HealthServicesStatus;
  timestamp: string;
}

async function probeDocker(): Promise<boolean> {
  try {
    const isWin = process.platform === "win32";
    const socketPath = isWin ? "//./pipe/docker_engine" : "/var/run/docker.sock";
    const socketOk = await new Promise<boolean>((resolve) => {
      const req = http.get({ socketPath, path: "/_ping", timeout: 1500 }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    });

    if (socketOk) return true;

    // CLI fallback with timeout
    const { stdout } = await execFileAsync("docker", ["version", "--format", "{{.Server.Version}}"], {
      timeout: 2000,
    });
    return !!stdout.trim();
  } catch {
    return false;
  }
}

export async function checkSystemHealth(): Promise<HealthReport> {
  const services: HealthServicesStatus = {
    postgres: false,
    postgresSystem: false,
    redis: false,
    s3: false,
    docker: false,
    worker: false,
  };

  // 1. App Postgres
  try {
    await db.execute(sql`SELECT 1`);
    services.postgres = true;
  } catch {
    services.postgres = false;
  }

  // 2. System Postgres
  try {
    await systemDb.execute(sql`SELECT 1`);
    services.postgresSystem = true;
  } catch {
    services.postgresSystem = false;
  }

  // 3. Redis
  try {
    const redis = getRedisConnection();
    const pong = await redis.ping();
    services.redis = pong === "PONG";
  } catch {
    services.redis = false;
  }

  // 4. S3 Storage
  try {
    await s3Client.send(new ListBucketsCommand({}));
    services.s3 = true;
  } catch {
    services.s3 = false;
  }

  // 5. Docker socket / CLI
  services.docker = await probeDocker();

  // 6. Worker heartbeat (< 60s)
  try {
    const cutoff = new Date(Date.now() - 60_000);
    const recent = await systemDb
      .select({ id: workerHeartbeats.id })
      .from(workerHeartbeats)
      .where(gt(workerHeartbeats.lastSeen, cutoff))
      .limit(1);
    services.worker = recent.length > 0;
  } catch {
    services.worker = false;
  }

  const coreUp = services.postgres && services.postgresSystem && services.redis && services.s3;
  const allUp = coreUp && services.docker && services.worker;

  let overallStatus: "healthy" | "degraded" | "down" = "healthy";
  if (!coreUp) {
    overallStatus = "down";
  } else if (!allUp) {
    overallStatus = "degraded";
  }

  return {
    status: overallStatus,
    services,
    timestamp: new Date().toISOString(),
  };
}
