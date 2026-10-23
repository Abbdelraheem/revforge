import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { systemDb } from "@/db";
import { users, workspaces, projects, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // 1. Audit log before scrubbing
  await systemDb.insert(auditLog).values({
    actorType: "user",
    action: "gdpr_erasure_requested",
    resourceType: "user",
    resourceId: userId,
    metadata: {
      compliance: "GDPR Article 17 / CCPA Right to be Forgotten",
      requestedAt: new Date().toISOString(),
    },
  });

  // 2. Anonymize user PII while preserving append-only financial/tax records for 7-year statutory period
  const anonymizedEmail = `scrubbed-${userId.slice(0, 8)}@revforge.local`;

  await systemDb
    .update(users)
    .set({
      name: "Anonymized User",
      email: anonymizedEmail,
      passwordHash: null,
      image: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // 3. Mark user workspaces as archived/quarantined
  await systemDb
    .update(workspaces)
    .set({
      name: `Archived Workspace (${userId.slice(0, 8)})`,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.ownerId, userId));

  // Clear auth cookie
  const response = NextResponse.json({
    success: true,
    message: "User account and PII scrubbed in accordance with GDPR Article 17 / CCPA.",
  });

  response.cookies.delete("revforge_session_token");

  return response;
}
