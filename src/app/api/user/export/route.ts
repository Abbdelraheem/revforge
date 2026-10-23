import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { systemDb } from "@/db";
import { users, workspaces, projects, orders, auditLog } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { zipSync, strToU8 } from "fflate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // 1. Fetch user profile
  const [userProfile] = await systemDb
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      platformRole: users.platformRole,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  // 2. Fetch owned workspaces
  const userWorkspaces = await systemDb
    .select()
    .from(workspaces)
    .where(eq(workspaces.ownerId, userId));

  const workspaceIds = userWorkspaces.map((w) => w.id);

  // 3. Fetch projects and orders within user workspaces
  let userProjects: any[] = [];
  let userOrders: any[] = [];
  let userAudits: any[] = [];

  if (workspaceIds.length > 0) {
    userProjects = await systemDb
      .select()
      .from(projects)
      .where(inArray(projects.workspaceId, workspaceIds));

    userOrders = await systemDb
      .select()
      .from(orders)
      .where(inArray(orders.workspaceId, workspaceIds));

    userAudits = await systemDb
      .select()
      .from(auditLog)
      .where(inArray(auditLog.workspaceId, workspaceIds));
  }

  const exportBundle = {
    exportDate: new Date().toISOString(),
    regulation: "GDPR Article 15 / CCPA Section 1798.100",
    profile: userProfile,
    workspaces: userWorkspaces,
    projects: userProjects,
    orders: userOrders,
    auditHistory: userAudits,
  };

  // Create clean zip export
  const zipFiles: Record<string, Uint8Array> = {
    "metadata.json": strToU8(JSON.stringify(exportBundle, null, 2)),
    "profile.json": strToU8(JSON.stringify(userProfile, null, 2)),
    "workspaces.json": strToU8(JSON.stringify(userWorkspaces, null, 2)),
    "projects.json": strToU8(JSON.stringify(userProjects, null, 2)),
    "orders.json": strToU8(JSON.stringify(userOrders, null, 2)),
  };

  const zipped = zipSync(zipFiles);
  const dateStr = new Date().toISOString().split("T")[0];

  return new NextResponse(Buffer.from(zipped), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="revforge-data-export-${dateStr}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
