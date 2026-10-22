"use server";

import { requireSession } from "@/lib/auth";
import { withTenant } from "@/db/tenant";
import { attestations, targets, projects, auditLog } from "@/db/schema";
import { checkTargetDenyList } from "@/lib/security/deny-list";
import { transitionProject } from "@/db/state-machine";
import crypto from "node:crypto";
import { headers } from "next/headers";

export interface CreateProjectWizardInput {
  name: string;
  description?: string;
  kind: "url" | "github_repo" | "play_store" | "app_store" | "apk" | "pe_binary" | "elf_binary" | "macho_binary" | "asar_package" | "har_archive";
  rawInput: string;
  attestationType: "owner" | "written_permission" | "interoperability_only";
  acceptPolicy: boolean;
  targetSha256?: string;
  storageKey?: string;
}

export async function submitProjectWizardAction(data: CreateProjectWizardInput) {
  const session = await requireSession();
  const headersList = await headers();

  if (!data.name || !data.rawInput || !data.attestationType) {
    return { error: "Name, target input, and attestation type are required." };
  }

  if (!data.acceptPolicy) {
    return { error: "You must accept the Acceptable Use and Clean-Room policies." };
  }

  // Deny-list check for URL targets
  if (data.kind === "url" || data.kind === "github_repo") {
    const denyCheck = checkTargetDenyList(data.rawInput);
    if (!denyCheck.allowed) {
      return { error: denyCheck.reason || "Target URL is prohibited on the platform." };
    }
  }

  // Compute IP and User-Agent hashes for non-repudiation
  const clientIp = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";
  const ipHash = crypto.createHash("sha256").update(clientIp).digest("hex");
  const userAgentHash = crypto.createHash("sha256").update(userAgent).digest("hex");
  const targetHash = data.targetSha256 || crypto.createHash("sha256").update(data.rawInput).digest("hex");

  // Atomic database creation
  const result = await withTenant(
    { userId: session.user.id, workspaceId: session.workspace.id },
    async (tx) => {
      // 1. Create Project row
    const [project] = await tx
      .insert(projects)
      .values({
        workspaceId: session.workspace.id,
        userId: session.user.id,
        name: data.name.trim(),
        description: data.description?.trim(),
        status: "draft",
      })
      .returning();

    if (!project) throw new Error("Failed to create project record.");

    // 2. Create Target row
    await tx.insert(targets).values({
      workspaceId: session.workspace.id,
      projectId: project.id,
      kind: data.kind,
      rawInput: data.rawInput,
      sha256: targetHash,
      storageKey: data.storageKey,
      detectedPlatform: data.kind,
    });

    // 3. Create Attestation record (append-only)
    await tx.insert(attestations).values({
      workspaceId: session.workspace.id,
      projectId: project.id,
      userId: session.user.id,
      type: data.attestationType,
      statementVersion: 1,
      ipHash,
      userAgentHash,
      targetSha256: targetHash,
    });

    // 4. Transition Project from draft -> analyzing
    await transitionProject(
      tx as any,
      project.id,
      "draft",
      "analyzing",
      { type: "user", userId: session.user.id }
    );

    // 5. Audit Log
    await tx.insert(auditLog).values({
      workspaceId: session.workspace.id,
      userId: session.user.id,
      actorType: "user",
      action: "project.wizard_submitted",
      resourceType: "projects",
      resourceId: project.id,
      metadata: {
        attestationType: data.attestationType,
        targetKind: data.kind,
      },
    });

    return { projectId: project.id };
  });

  return { success: true, projectId: result.projectId };
}

export async function submitTargetAction(formData: FormData) {
  const targetInput = String(formData.get("targetInput") || "");
  const name = String(formData.get("name") || targetInput.split("/").pop() || "Reconstructed Project");
  const result = await submitProjectWizardAction({
    name,
    rawInput: targetInput,
    kind: "url",
    attestationType: "interoperability_only",
    acceptPolicy: true,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  const { redirect } = await import("next/navigation");
  redirect(`/projects/${result.projectId}`);
}
