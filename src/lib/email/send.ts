import { Resend } from "resend";
import { BRAND } from "@/config/brand";
import { env } from "@/env";

const resendApiKey = env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL = env.EMAIL_FROM;

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    if (env.NODE_ENV !== "production") {
      process.stdout.write(`[Dev Mailbox] To: ${Array.isArray(options.to) ? options.to.join(", ") : options.to}\n`);
      return { success: true, id: `dev-mock-${Date.now()}` };
    }
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, id: result.data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to dispatch email" };
  }
}

export async function sendVerifyEmail(to: string, verificationLink: string) {
  return sendEmail({
    to,
    subject: `Verify your email for ${BRAND.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Verify Your Email</h2>
        <p>Thank you for creating an account with ${BRAND.name}. Please confirm your email address by clicking the link below:</p>
        <p><a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px;">Confirm Email Address</a></p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">If you did not register for an account, please ignore this email.</p>
      </div>
    `,
  });
}

export async function sendResetPasswordEmail(to: string, resetLink: string) {
  return sendEmail({
    to,
    subject: `Reset your ${BRAND.name} password`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. Click the link below to choose a new password:</p>
        <p><a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">If you did not request a password reset, your credentials remain secure and you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendAnalysisReadyEmail(to: string, projectName: string, projectUrl: string) {
  return sendEmail({
    to,
    subject: `Architectural Analysis Ready: ${projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Analysis Complete</h2>
        <p>Your architectural analysis for <strong>${projectName}</strong> is ready for review.</p>
        <p><a href="${projectUrl}" style="display: inline-block; padding: 10px 20px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px;">View Technical Report & Quote</a></p>
      </div>
    `,
  });
}

export async function sendDeliveryReadyEmail(params: {
  to: string;
  projectName: string;
  deliveryUrl: string;
  sha256?: string;
  sizeBytes?: number;
  expiresAt: Date;
  versionLabel?: string;
}) {
  const { to, projectName, deliveryUrl, sha256, sizeBytes, expiresAt, versionLabel } = params;
  const sizeMb =
    sizeBytes != null ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB` : null;
  const digestLine = sha256
    ? `<p>SHA-256: <code style="word-break: break-all;">${sha256}</code>${sizeMb ? `<br />Archive size: ${sizeMb}` : ""}<br />Retained until: ${expiresAt.toISOString()}</p>`
    : `<p>Retained until: ${expiresAt.toISOString()}</p>`;
  const textDigest = [
    sha256 ? `SHA-256: ${sha256}.` : "",
    sizeMb ? `Size: ${sizeMb}.` : "",
    `Retained until ${expiresAt.toISOString()}.`,
  ]
    .filter(Boolean)
    .join(" ");

  return sendEmail({
    to,
    subject: `Delivery ready: ${projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Your delivery is ready</h2>
        <p>The verified archive for <strong>${projectName}</strong> is available in your workspace.</p>
        ${versionLabel ? `<p>Version: <strong>${versionLabel}</strong></p>` : ""}
        ${digestLine}
        <p><a href="${deliveryUrl}" style="display: inline-block; padding: 10px 20px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px;">Open delivery</a></p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">The email links to your authenticated workspace. It does not contain a long-lived storage credential.</p>
      </div>
    `,
    text: `Delivery ready for ${projectName}.${versionLabel ? ` Version: ${versionLabel}.` : ""} ${textDigest} Open: ${deliveryUrl}`,
  });
}

export async function sendBuildFinishedEmail(to: string, projectName: string, downloadUrl: string) {
  return sendEmail({
    to,
    subject: `Build Finished: ${projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Clean-Room Build Finished</h2>
        <p>Your clean-room repository for <strong>${projectName}</strong> has completed automated compilation and verification.</p>
        <p><a href="${downloadUrl}" style="display: inline-block; padding: 10px 20px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px;">Download Verified Package</a></p>
      </div>
    `,
  });
}
