import { db } from "./index";
import { pricingConfig, users, workspaces, workspaceMembers } from "./schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { env } from "@/env";

const log = (msg: string) => process.stdout.write(msg + "\n");

/**
 * Seed initial pricing configuration v1 and superadmin account
 */
export async function seed() {
  log("[SEED] Initializing database seed...");

  // 1. Seed Pricing Config v1 per Section 5
  const existingConfig = await db
    .select()
    .from(pricingConfig)
    .where(eq(pricingConfig.version, 1));

  if (existingConfig.length === 0) {
    log("[SEED] Inserting Pricing Config v1...");
    await db.insert(pricingConfig).values({
      version: 1,
      factorBp: 5000, // 0.50 factor
      maxHoursPerFeature: 200,
      tiers: {
        portfolio: {
          hourlyRateCents: 4000, // $40
          minFeatureCents: 900,  // $9
          minOrderCents: 2900,   // $29
        },
        web_app: {
          hourlyRateCents: 6000, // $60
          minFeatureCents: 1900, // $19
          minOrderCents: 9900,   // $99
        },
        mobile_app: {
          hourlyRateCents: 7500, // $75
          minFeatureCents: 2900, // $29
          minOrderCents: 19900,  // $199
        },
        desktop_binary: {
          hourlyRateCents: 9500, // $95
          minFeatureCents: 3900, // $39
          minOrderCents: 29900,  // $299
        },
        enterprise_saas: {
          hourlyRateCents: 11000, // $110
          minFeatureCents: 4900,  // $49
          minOrderCents: 49900,   // $499
        },
      },
    });
    log("[SEED] ✓ Pricing Config v1 inserted successfully.");
  } else {
    log("[SEED] Pricing Config v1 already present.");
  }

  // 2. Seed Default Admin Workspace & Superadmin user
  const adminEmail = env.SUPERADMIN_EMAIL;
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail));

  if (existingAdmin.length === 0) {
    log(`[SEED] Seeding superadmin user (${adminEmail})...`);
    // Default salt:hash for dev/seeding
    const defaultSalt = crypto.randomBytes(16).toString("hex");
    const defaultHash = crypto.scryptSync("AdminRevForge2026!", defaultSalt, 64).toString("hex");

    const [adminUser] = await db
      .insert(users)
      .values({
        email: adminEmail,
        name: "Platform Superadmin",
        emailVerified: true,
        passwordHash: `${defaultSalt}:${defaultHash}`,
        platformRole: "superadmin",
        analysisCreditsUsed: 0,
      })
      .returning();

    if (adminUser) {
      log(`[SEED] Creating admin root workspace...`);
      const [adminWs] = await db
        .insert(workspaces)
        .values({
          name: "System Operations",
          slug: "system-ops",
          ownerId: adminUser.id,
        })
        .returning();

      if (adminWs) {
        await db.insert(workspaceMembers).values({
          workspaceId: adminWs.id,
          userId: adminUser.id,
          role: "owner",
        });
      }
    }
    log("[SEED] ✓ Superadmin user & workspace seeded.");
  }

  log("[SEED] Database seeding complete.");
}

// Direct CLI invocation
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[SEED_ERROR]", err);
      process.exit(1);
    });
}
