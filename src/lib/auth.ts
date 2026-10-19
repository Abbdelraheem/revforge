import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, workspaces, workspaceMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const SESSION_COOKIE_NAME = "revforge_session_token";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  platformRole: "user" | "superadmin";
  analysisCreditsUsed: number;
}

export interface SessionWorkspace {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member" | "viewer";
}

export interface AuthSession {
  user: SessionUser;
  workspace: SessionWorkspace;
}

/**
 * Creates a cryptographically secure password hash using scrypt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against the stored salt:hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(":");
    if (!salt || !originalHash) return false;
    const computedHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, "hex"),
      Buffer.from(originalHash, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Signs a session payload into a tamper-proof signed cookie string
 */
export function signSessionPayload(data: { userId: string; workspaceId: string }): string {
  const secret = process.env.AUTH_SECRET || "revforge_dev_secret_must_be_set_in_production";
  const payloadStr = JSON.stringify({ ...data, expires: Date.now() + SESSION_MAX_AGE * 1000 });
  const hmac = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");
  return `${Buffer.from(payloadStr).toString("base64url")}.${hmac}`;
}

/**
 * Verifies and decodes a signed session cookie
 */
export function verifySessionToken(token: string): { userId: string; workspaceId: string } | null {
  try {
    const [encodedPayload, providedHmac] = token.split(".");
    if (!encodedPayload || !providedHmac) return null;

    const secret = process.env.AUTH_SECRET || "revforge_dev_secret_must_be_set_in_production";
    const payloadStr = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const expectedHmac = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(providedHmac, "hex"),
        Buffer.from(expectedHmac, "hex")
      )
    ) {
      return null;
    }

    const payload = JSON.parse(payloadStr);
    if (payload.expires < Date.now()) return null;

    return { userId: payload.userId, workspaceId: payload.workspaceId };
  } catch {
    return null;
  }
}

/**
 * Gets the current verified session from HTTP cookies
 */
export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const verified = verifySessionToken(token);
  if (!verified) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
      platformRole: users.platformRole,
      analysisCreditsUsed: users.analysisCreditsUsed,
    })
    .from(users)
    .where(eq(users.id, verified.userId));

  if (!user) return null;

  const [membership] = await db
    .select({
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      and(
        eq(workspaceMembers.userId, user.id),
        eq(workspaceMembers.workspaceId, verified.workspaceId)
      )
    );

  if (!membership) return null;

  return {
    user,
    workspace: {
      id: membership.workspaceId,
      name: membership.workspaceName,
      slug: membership.workspaceSlug,
      role: membership.role as SessionWorkspace["role"],
    },
  };
}

/**
 * Enforces session requirement; redirects or throws if unauthorized
 */
export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  return session;
}

/**
 * Enforces superadmin platform role for /admin endpoints
 */
export async function requireSuperadmin(): Promise<AuthSession> {
  const session = await requireSession();
  if (session.user.platformRole !== "superadmin") {
    throw new Error("Access forbidden: Superadmin role required");
  }
  return session;
}
