"use server";

import { systemDb } from "@/db";
import { abuseReports } from "@/db/schema";
import { z } from "zod";

const SubmitAbuseSchema = z.object({
  targetUrl: z.string().min(1),
  reporterEmail: z.string().email(),
  reason: z.string().min(2),
  details: z.string().min(10),
  projectId: z.string().uuid().optional(),
});

export async function submitAbuseReport(formData: FormData) {
  const parsed = SubmitAbuseSchema.safeParse({
    targetUrl: formData.get("targetUrl"),
    reporterEmail: formData.get("reporterEmail"),
    reason: formData.get("reason"),
    details: formData.get("details"),
    projectId: formData.get("projectId") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input." };
  }

  await systemDb.insert(abuseReports).values({
    targetUrl: parsed.data.targetUrl,
    reporterEmail: parsed.data.reporterEmail,
    reason: parsed.data.reason,
    details: parsed.data.details,
    projectId: parsed.data.projectId,
    status: "pending",
  });

  return { success: true, message: "Abuse report recorded and queued for legal compliance review." };
}
