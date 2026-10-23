import "dotenv/config";
import "./smoke-env";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { strToU8, unzipSync, zipSync } from "fflate";
import { eq } from "drizzle-orm";
import { checkSystemHealth } from "../src/lib/health/probe";
import { systemDb } from "../src/db";
import { withTenant } from "../src/db/tenant";
import {
  attestations,
  buildJobs,
  creditsLedger,
  deliveries,
  orders,
  projects,
  studioEdits,
  studioVersions,
  users,
  workspaces,
} from "../src/db/schema";
import { priceQuote, DEFAULT_PRICING_CONFIG_V1 } from "../src/lib/pricing/engine";
import { BUILD_MODELS } from "../src/config/models";
import { executeStudioEdit } from "../src/lib/studio/worker";
import { fixtureEnhanceStructuredCall } from "../src/lib/studio/enhance";
import { verifyBuildWorkspace } from "../src/lib/build/verifier";
import { storage } from "../src/lib/storage";

async function writeFixtureWorkspace(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name: "studio-smoke-project",
        version: "1.0.0",
        private: true,
        scripts: {
          build: "node build.js",
          test: "node test.js",
        },
      },
      null,
      2
    )
  );
  await fs.writeFile(
    path.join(dir, "build.js"),
    [
      'const app = require("./app.js");',
      'if (!app || typeof app.message !== "string") {',
      '  throw new Error("app.js must export a message");',
      "}",
      'console.log("build ok");',
      "",
    ].join("\n")
  );
  await fs.writeFile(
    path.join(dir, "test.js"),
    [
      'const assert = require("node:assert");',
      'const app = require("./app.js");',
      'assert.strictEqual(typeof app.message, "string");',
      'console.log("test ok");',
      "",
    ].join("\n")
  );
  await fs.writeFile(
    path.join(dir, "app.js"),
    'module.exports = { message: "Hello from the base delivery" };\n'
  );
  await fs.writeFile(path.join(dir, ".gitignore"), "node_modules\n.next\n");
}

function collectFixtureFiles(
  dir: string,
  baseDir: string,
  out: Record<string, Uint8Array> = {}
): Record<string, Uint8Array> {
  const entries = fsSync.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      collectFixtureFiles(full, baseDir, out);
    } else if (entry.isFile()) {
      const rel = path.relative(baseDir, full).replace(/\\/g, "/");
      out[rel] = new Uint8Array(fsSync.readFileSync(full));
    }
  }
  return out;
}

async function runSmoke() {
  console.log("=== RevForge Live Wire Smoke Test (V6) ===");

  console.log("[1/8] Probing system health dependencies...");
  const health = await checkSystemHealth();
  console.log("Health Probe Results:", JSON.stringify(health, null, 2));

  const { postgres, postgresSystem, redis, s3 } = health.services;
  if (!postgres || !postgresSystem || !redis || !s3) {
    const downList = Object.entries(health.services)
      .filter(([_, up]) => !up)
      .map(([name]) => name);
    console.error(`FATAL: Required core services are DOWN: ${downList.join(", ")}`);
    process.exit(1);
  }

  console.log("[2/8] Core services (Postgres, System Postgres, Redis, S3) are UP.");

  const testUserId = crypto.randomUUID();
  const testWorkspaceId = crypto.randomUUID();
  const testWorkspaceId2 = crypto.randomUUID();
  const testProjectId = crypto.randomUUID();
  const fixtureDir = path.join(os.tmpdir(), `revforge-smoke-studio-${testProjectId}`);
  const restoreDir = path.join(os.tmpdir(), `revforge-smoke-studio-restore-${testProjectId}`);

  try {
    console.log("[3/8] Setting up temporary user, workspaces, and project...");
    await systemDb.insert(users).values({
      id: testUserId,
      email: `smoke-${Date.now()}@test.internal`,
      name: "Smoke User",
      platformRole: "user",
      emailVerified: true,
    });

    await systemDb.insert(workspaces).values({
      id: testWorkspaceId,
      name: "Smoke Test Workspace",
      slug: `smoke-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ownerId: testUserId,
    });

    await systemDb.insert(workspaces).values({
      id: testWorkspaceId2,
      name: "Smoke Test Workspace Isolation Check",
      slug: `smoke-iso-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ownerId: testUserId,
    });

    console.log("[4/8] Exercising real quote calculator...");
    const quote = priceQuote(
      [
        {
          id: "smoke-feat-1",
          name: "Smoke Feature",
          tier: "web_app",
          estimatedHours: 20,
          selected: true,
        },
      ],
      DEFAULT_PRICING_CONFIG_V1
    );
    if (!quote || quote.totalCents <= 0) {
      throw new Error(`Quote calculator produced invalid quote total: ${quote?.totalCents}`);
    }
    console.log(
      `Quote calculated successfully: $${quote.totalCents / 100} (${quote.totalCents} cents).`
    );

    console.log("[5/8] Testing RLS isolation across tenant boundaries...");
    await withTenant({ userId: testUserId, workspaceId: testWorkspaceId }, async (tx) => {
      await tx.insert(projects).values({
        id: testProjectId,
        workspaceId: testWorkspaceId,
        userId: testUserId,
        name: "Smoke Test Project",
        description: "Studio edit smoke fixture",
        status: "delivered",
      });

      await tx.insert(attestations).values({
        id: crypto.randomUUID(),
        projectId: testProjectId,
        userId: testUserId,
        workspaceId: testWorkspaceId,
        type: "owner",
        statementVersion: 1,
        targetSha256: "0".repeat(64),
        ipHash: "1".repeat(64),
        userAgentHash: "2".repeat(64),
      });
    });

    const rowsWs1 = await withTenant(
      { userId: testUserId, workspaceId: testWorkspaceId },
      async (tx) => tx.select().from(projects).where(eq(projects.id, testProjectId))
    );
    if (rowsWs1.length !== 1) {
      throw new Error(
        `Expected 1 project row for tenant ${testWorkspaceId}, found ${rowsWs1.length}`
      );
    }

    const rowsWs2 = await withTenant(
      { userId: testUserId, workspaceId: testWorkspaceId2 },
      async (tx) => tx.select().from(projects).where(eq(projects.id, testProjectId))
    );
    if (rowsWs2.length !== 0) {
      throw new Error(
        `RLS VIOLATION: Tenant ${testWorkspaceId2} was able to read project ${testProjectId}! Found ${rowsWs2.length} rows.`
      );
    }
    console.log("RLS isolation verified: 0 rows leaked to different workspace.");

    console.log("[6/8] Uploading a real base workspace archive to S3...");
    await writeFixtureWorkspace(fixtureDir);
    const fixtureFiles = collectFixtureFiles(fixtureDir, fixtureDir);
    const baseZip = Buffer.from(zipSync(fixtureFiles, { level: 6 }));
    const baseKey = `deliveries/${testWorkspaceId}/${testProjectId}/smoke-base.zip`;
    await storage.putObject(baseKey, baseZip, "application/zip");

    const [order] = await systemDb
      .insert(orders)
      .values({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        kind: "build",
        status: "paid",
        amountCents: 1000,
        provider: "fake",
        providerTxnId: `smoke-${crypto.randomUUID()}`,
      })
      .returning();

    if (!order) throw new Error("Failed to create smoke build order.");

    const [job] = await systemDb
      .insert(buildJobs)
      .values({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        orderId: order.id,
        status: "delivered",
        costCapCents: 1000,
        spentCents: 0,
        parityScore: null,
        stage: "delivered",
      })
      .returning();

    if (!job) throw new Error("Failed to create smoke build job.");

    await systemDb.insert(deliveries).values({
      workspaceId: testWorkspaceId,
      jobId: job.id,
      storageKey: baseKey,
      sha256: crypto.createHash("sha256").update(baseZip).digest("hex"),
      sizeBytes: baseZip.length,
      status: "full",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const baseFiles = Object.fromEntries(
      Object.entries(fixtureFiles).map(([rel, bytes]) => [
        rel,
        Buffer.from(bytes),
      ])
    );
    const baseManifest = Object.entries(baseFiles).map(([rel, bytes]) => ({
      path: rel,
      size: bytes.length,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    }));

    const [parentVersion] = await systemDb
      .insert(studioVersions)
      .values({
        projectId: testProjectId,
        workspaceId: testWorkspaceId,
        versionNumber: 1,
        label: "v1: Smoke Base Delivery",
        zipStorageKey: baseKey,
        previewUrl: `/api/studio/preview/${testProjectId}/`,
        parityScore: null,
        filesManifest: baseManifest,
        createdBy: testUserId,
      })
      .returning();

    if (!parentVersion) throw new Error("Failed to create smoke base version.");

    await systemDb.insert(creditsLedger).values({
      workspaceId: testWorkspaceId,
      deltaCents: 5000,
      reason: "smoke_test_grant",
      kind: "grant",
    });

    const [edit] = await systemDb
      .insert(studioEdits)
      .values({
        projectId: testProjectId,
        workspaceId: testWorkspaceId,
        userId: testUserId,
        parentVersionId: parentVersion.id,
        promptRaw: "Change the smoke app message to a Studio-edited value",
        tokensHeldCents: 200,
        status: "pending",
      })
      .returning();

    if (!edit) throw new Error("Failed to create smoke studio edit.");

    console.log("[7/8] Running a real Studio edit with a scripted builder...");
    const result = await executeStudioEdit(
      {
        editId: edit.id,
        projectId: testProjectId,
        workspaceId: testWorkspaceId,
        userId: testUserId,
        parentVersionId: parentVersion.id,
        rawPrompt: "Change the smoke app message to a Studio-edited value",
        maxCents: 200,
      },
      {
        enhanceCall: fixtureEnhanceStructuredCall,
        capture: async () => ({
          referenceScreenshots: [],
          renderedScreenshots: [],
          behavioralChecks: [],
        }),
        runBuilder: async ({ workspaceDir }) => {
          await fs.writeFile(
            path.join(workspaceDir, "app.js"),
            'module.exports = { message: "Hello from the Studio edit" };\n',
            "utf8"
          );
          return {
            usage: {
              model: BUILD_MODELS.STANDARD,
              inputTokens: 1_200,
              outputTokens: 600,
            },
            modifiedFiles: ["app.js"],
          };
        },
      }
    );

    if (!result.success || result.outcome !== "accepted") {
      throw new Error(
        `Studio edit was not accepted: ${result.outcome} ${result.failureReason || ""}`
      );
    }
    if (!result.versionId) {
      throw new Error("Studio edit did not produce a version id.");
    }

    const [newVersion] = await systemDb
      .select()
      .from(studioVersions)
      .where(eq(studioVersions.id, result.versionId));

    if (!newVersion) throw new Error("Produced Studio version row is missing.");

    const parentHashes = new Map(
      (parentVersion.filesManifest as Array<{ path: string; sha256: string }>).map(
        (entry) => [entry.path, entry.sha256]
      )
    );
    const newHashes = new Map(
      (newVersion.filesManifest as Array<{ path: string; sha256: string }>).map(
        (entry) => [entry.path, entry.sha256]
      )
    );
    let differ = false;
    for (const [filePath, hash] of newHashes.entries()) {
      if (parentHashes.get(filePath) !== hash) differ = true;
    }
    for (const filePath of parentHashes.keys()) {
      if (!newHashes.has(filePath)) differ = true;
    }
    if (!differ) {
      throw new Error(
        "Studio version files are identical to the parent; the edit was not real."
      );
    }

    console.log("[8/8] Rebuilding the produced Studio version archive...");
    const producedZip = await storage.getObject(newVersion.zipStorageKey);
    const producedEntries = unzipSync(new Uint8Array(producedZip));
    await fs.rm(restoreDir, { recursive: true, force: true });
    await fs.mkdir(restoreDir, { recursive: true });
    for (const [rel, bytes] of Object.entries(producedEntries)) {
      if (rel.endsWith("/")) continue;
      const target = path.resolve(restoreDir, rel);
      if (!target.startsWith(path.resolve(restoreDir))) {
        throw new Error(`Unsafe path in produced archive: ${rel}`);
      }
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, Buffer.from(bytes));
    }

    const rebuilt = await verifyBuildWorkspace(
      { workspaceDir: restoreDir, expectedRoutes: [] },
      {
        async runCommand(cmd, args, cwd) {
          const { execFile } = await import("node:child_process");
          const { promisify } = await import("node:util");
          const execFileAsync = promisify(execFile);
          try {
            const res = await execFileAsync(cmd, args, {
              cwd,
              shell: false,
              timeout: 120_000,
              env: { ...process.env, CI: "true", NODE_ENV: "production" },
            });
            return { exitCode: 0, stdout: res.stdout, stderr: res.stderr };
          } catch (err: any) {
            return {
              exitCode: typeof err?.code === "number" ? err.code : 1,
              stdout: err?.stdout || "",
              stderr: err?.stderr || err?.message || String(err),
            };
          }
        },
      }
    );

    if (rebuilt.parity.buildHealth <= 0) {
      throw new Error(
        `Produced Studio version does not build: ${rebuilt.diagnostics.join("; ")}`
      );
    }

    const ledgerRows = await systemDb
      .select()
      .from(creditsLedger)
      .where(eq(creditsLedger.workspaceId, testWorkspaceId));
    const holdRow = ledgerRows.find((row) => row.reason === `studio_hold:${edit.id}`);
    const settleRow = ledgerRows.find((row) => row.reason === `studio_settle:${edit.id}`);
    if (!holdRow || holdRow.deltaCents !== -200) {
      throw new Error("Studio edit did not write the expected credit hold row.");
    }
    if (!settleRow) {
      throw new Error("Studio edit did not write the expected settlement row.");
    }
    if (holdRow.deltaCents + settleRow.deltaCents !== -result.tokensSettledCents) {
      throw new Error("Studio settlement does not reconcile to the actual charge.");
    }

    console.log(
      `Studio edit accepted: version v${result.versionNumber}, charge ${result.tokensSettledCents}¢, files differ from parent, build verified.`
    );
    console.log("=== ALL SMOKE TESTS PASSED ===");
    process.exit(0);
  } finally {
    console.log("Cleaning up smoke test database and filesystem records...");
    try {
      await systemDb.delete(projects).where(eq(projects.id, testProjectId));
      await systemDb.delete(workspaces).where(eq(workspaces.id, testWorkspaceId));
      await systemDb.delete(workspaces).where(eq(workspaces.id, testWorkspaceId2));
      await systemDb.delete(users).where(eq(users.id, testUserId));
    } catch (cleanupErr) {
      console.error("Cleanup warning:", cleanupErr);
    }
    await fs.rm(fixtureDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(restoreDir, { recursive: true, force: true }).catch(() => {});
  }
}

runSmoke().catch((err) => {
  console.error("Smoke test failure:", err);
  process.exit(1);
});
