import { Resend } from "resend";
import { BRAND } from "@/config/brand";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL = process.env.EMAIL_FROM || `${BRAND.name} <notifications@revforge.ai>`;

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    if (process.env.NODE_ENV !== "production") {
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
