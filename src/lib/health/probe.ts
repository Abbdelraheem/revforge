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

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

async function probeDocker(): Promise<boolean> {
  try {
    if (process.platform !== "win32") {
      const socketOk = await new Promise<boolean>((resolve) => {
        const req = http.get(
          { socketPath: "/var/run/docker.sock", path: "/_ping", timeout: 800 },
          (res) => {
            resolve(res.statusCode === 200);
          }
        );
        req.on("error", () => resolve(false));
        req.on("timeout", () => {
          req.destroy();
          resolve(false);
        });
      });
      if (socketOk) return true;
    }

    // CLI fallback with strict 800ms timeout
    const { stdout } = await execFileAsync(
      "docker",
      ["version", "--format", "{{.Server.Version}}"],
      { timeout: 800 }
    );
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
  services.postgres = await withTimeout(
    db.execute(sql`SELECT 1`).then(() => true),
    1000,
    false
  );

  // 2. System Postgres
  services.postgresSystem = await withTimeout(
    systemDb.execute(sql`SELECT 1`).then(() => true),
    1000,
    false
  );

  // 3. Redis
  services.redis = await withTimeout(
    (async () => {
      const redis = getRedisConnection();
      const pong = await redis.ping();
      return pong === "PONG";
    })(),
    1000,
    false
  );

  // 4. S3 Storage
  services.s3 = await withTimeout(
    s3Client.send(new ListBucketsCommand({})).then(() => true),
    1000,
    false
  );

  // 5. Docker socket / CLI
  services.docker = await withTimeout(probeDocker(), 1000, false);

  // 6. Worker heartbeat (< 60s)
  services.worker = await withTimeout(
    (async () => {
      const cutoff = new Date(Date.now() - 60_000);
      const recent = await systemDb
        .select({ id: workerHeartbeats.id })
        .from(workerHeartbeats)
        .where(gt(workerHeartbeats.lastSeen, cutoff))
        .limit(1);
      return recent.length > 0;
    })(),
    1000,
    false
  );

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
