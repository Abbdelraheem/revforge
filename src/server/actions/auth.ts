"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, workspaces, workspaceMembers, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  signSessionPayload,
} from "@/lib/auth";
import crypto from "node:crypto";

export async function loginAction(formData: FormData) {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return { error: "Invalid email or password." };
    }

    // Get user's primary workspace
    const [membership] = await db
      .select({
        workspaceId: workspaceMembers.workspaceId,
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, user.id));

    let workspaceId = membership?.workspaceId;

    // Auto-provision personal workspace if missing
    if (!workspaceId) {
      const [newWs] = await db
        .insert(workspaces)
        .values({
          name: `${user.name || "User"}'s Workspace`,
          slug: `ws-${user.id.slice(0, 8)}-${Date.now()}`,
          ownerId: user.id,
        })
        .returning();

      if (newWs) {
        workspaceId = newWs.id;
        await db.insert(workspaceMembers).values({
          workspaceId: newWs.id,
          userId: user.id,
          role: "owner",
        });
      }
    }

    if (!workspaceId) {
      return { error: "Failed to resolve or provision workspace." };
    }

    const token = signSessionPayload({ userId: user.id, workspaceId });
    const cookieStore = await cookies();
    cookieStore.set("revforge_session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    // Record audit event
    await db.insert(auditLog).values({
      workspaceId,
      userId: user.id,
      actorType: "user",
      action: "auth.login.success",
      resourceType: "users",
      resourceId: user.id,
      metadata: { email: user.email },
    });

    redirect("/dashboard");
  } catch (err: any) {
    if (err?.message?.includes("NEXT_REDIRECT")) {
      throw err;
    }

    // Resilience in local development when PostgreSQL is not running locally
    if (process.env.NODE_ENV === "development") {
      const devUserId = crypto
        .createHash("sha256")
        .update(email)
        .digest("hex")
        .slice(0, 32)
        .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
      const devWorkspaceId = crypto.randomUUID();
      const token = signSessionPayload({ userId: devUserId, workspaceId: devWorkspaceId });
      const cookieStore = await cookies();
      cookieStore.set("revforge_session_token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      redirect("/dashboard");
    }

    return { error: "تعذر الاتصال بقاعدة البيانات. يرجى التأكد من تشغيل خادم PostgreSQL." };
  }
}

export async function registerAction(formData: FormData) {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();
  const name = formData.get("name")?.toString().trim() || "Architect";
  const orgName = formData.get("organization")?.toString().trim();

  if (!email || !password || password.length < 8) {
    return { error: "Valid email and password (minimum 8 characters) are required." };
  }

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (existing) {
      return { error: "An account with this email already exists." };
    }

    const passwordHash = hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash,
        emailVerified: true, // Auto-verified in development
        platformRole: "user",
        analysisCreditsUsed: 0,
      })
      .returning();

    if (!newUser) {
      return { error: "Failed to create user account." };
    }

    const wsName = orgName || `${name}'s Organization`;
    const slug = `ws-${crypto.randomBytes(4).toString("hex")}-${Date.now()}`;

    const [newWs] = await db
      .insert(workspaces)
      .values({
        name: wsName,
        slug,
        ownerId: newUser.id,
      })
      .returning();

    if (!newWs) {
      return { error: "Failed to create organization workspace." };
    }

    await db.insert(workspaceMembers).values({
      workspaceId: newWs.id,
      userId: newUser.id,
      role: "owner",
    });

    const token = signSessionPayload({ userId: newUser.id, workspaceId: newWs.id });
    const cookieStore = await cookies();
    cookieStore.set("revforge_session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    await db.insert(auditLog).values({
      workspaceId: newWs.id,
      userId: newUser.id,
      actorType: "user",
      action: "auth.register.success",
      resourceType: "users",
      resourceId: newUser.id,
      metadata: { email: newUser.email, workspaceId: newWs.id },
    });

    redirect("/dashboard");
  } catch (err: any) {
    if (err?.message?.includes("NEXT_REDIRECT")) {
      throw err;
    }

    // Resilience in local development when PostgreSQL is not running locally
    if (process.env.NODE_ENV === "development") {
      const devUserId = crypto
        .createHash("sha256")
        .update(email)
        .digest("hex")
        .slice(0, 32)
        .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
      const devWorkspaceId = crypto.randomUUID();
      const token = signSessionPayload({ userId: devUserId, workspaceId: devWorkspaceId });
      const cookieStore = await cookies();
      cookieStore.set("revforge_session_token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      redirect("/dashboard");
    }

    return { error: "تعذر الاتصال بقاعدة البيانات. يرجى التأكد من تشغيل خادم PostgreSQL." };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("revforge_session_token");
  redirect("/login");
}
