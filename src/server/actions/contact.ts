"use server";

import { systemDb } from "@/db";
import { abuseReports } from "@/db/schema";
import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(2),
  message: z.string().min(10),
});

export async function submitContactForm(formData: FormData) {
  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid contact form input." };
  }

  // Persist contact message in abuseReports table as contact inquiry
  await systemDb.insert(abuseReports).values({
    targetUrl: `contact://inquiry?subject=${encodeURIComponent(parsed.data.subject)}`,
    reporterEmail: parsed.data.email,
    reason: `Contact Inquiry: ${parsed.data.subject}`,
    details: `From: ${parsed.data.name} (${parsed.data.email})\n\nMessage:\n${parsed.data.message}`,
    status: "pending",
  });

  return { success: true, message: "Your message has been received by engineering operations." };
}
