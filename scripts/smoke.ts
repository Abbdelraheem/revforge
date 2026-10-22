import "dotenv/config";
import { checkSystemHealth } from "../src/lib/health/probe";
import { systemDb } from "../src/db";
import { withTenant } from "../src/db/tenant";
import { workspaces, users, projects, attestations } from "../src/db/schema";
import { priceQuote, DEFAULT_PRICING_CONFIG_V1 } from "../src/lib/pricing/engine";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

async function runSmoke() {
  console.log("=== RevForge Live Wire Smoke Test ===");

  // 1. Probe health
  console.log("[1/5] Probing system health dependencies...");
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

  console.log("[2/5] Core services (Postgres, System Postgres, Redis, S3) are UP.");

  // Test identifiers
  const testUserId = crypto.randomUUID();
  const testWorkspaceId = crypto.randomUUID();
  const testWorkspaceId2 = crypto.randomUUID();
  const testProjectId = crypto.randomUUID();

  try {
    console.log("[3/5] Setting up temporary test user and workspaces via systemDb...");
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

    // Exercise quote calculator
    console.log("[4/5] Exercising real quote calculator...");
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
    console.log(`Quote calculated successfully: $${quote.totalCents / 100} (${quote.totalCents} cents).`);

    // Insert project and attestation inside tenant context
    console.log("[5/5] Testing RLS isolation across tenant boundaries...");
    await withTenant({ userId: testUserId, workspaceId: testWorkspaceId }, async (tx) => {
      await tx.insert(projects).values({
        id: testProjectId,
        workspaceId: testWorkspaceId,
        userId: testUserId,
        name: "Smoke Test Project",
        status: "draft",
      });

      await tx.insert(attestations).values({
        id: crypto.randomUUID(),
        projectId: testProjectId,
        userId: testUserId,
        workspaceId: testWorkspaceId,
        type: "owner",
        statementVersion: 1,
        targetSha256: "0000000000000000000000000000000000000000000000000000000000000000",
        ipHash: "1111111111111111111111111111111111111111111111111111111111111111",
        userAgentHash: "2222222222222222222222222222222222222222222222222222222222222222",
      });
    });

    // Verify reading with workspaceId 1 sees the project
    const rowsWs1 = await withTenant({ userId: testUserId, workspaceId: testWorkspaceId }, async (tx) => {
      return tx.select().from(projects).where(eq(projects.id, testProjectId));
    });
    if (rowsWs1.length !== 1) {
      throw new Error(`Expected 1 project row for tenant ${testWorkspaceId}, found ${rowsWs1.length}`);
    }

    // Verify reading with workspaceId 2 (second workspace) sees 0 rows under RLS!
    const rowsWs2 = await withTenant({ userId: testUserId, workspaceId: testWorkspaceId2 }, async (tx) => {
      return tx.select().from(projects).where(eq(projects.id, testProjectId));
    });
    if (rowsWs2.length !== 0) {
      throw new Error(
        `RLS VIOLATION: Tenant ${testWorkspaceId2} was able to read project ${testProjectId}! Found ${rowsWs2.length} rows.`
      );
    }

    console.log("RLS isolation verified: 0 rows leaked to different workspace.");
    console.log("=== ALL SMOKE TESTS PASSED ===");
    process.exit(0);
  } finally {
    console.log("Cleaning up smoke test database records...");
    try {
      await systemDb.delete(projects).where(eq(projects.id, testProjectId));
      await systemDb.delete(workspaces).where(eq(workspaces.id, testWorkspaceId));
      await systemDb.delete(workspaces).where(eq(workspaces.id, testWorkspaceId2));
      await systemDb.delete(users).where(eq(users.id, testUserId));
    } catch (cleanupErr) {
      console.error("Cleanup warning:", cleanupErr);
    }
  }
}

runSmoke().catch((err) => {
  console.error("Smoke test failure:", err);
  process.exit(1);
});
