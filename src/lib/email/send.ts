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

export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    if (env.NODE_ENV !== "production") {
      process.stdout.write(
        `[Dev Mailbox] To: ${
          Array.isArray(options.to) ? options.to.join(", ") : options.to
        }\n`
      );
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
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Verify Your Email</h2>
        <p>Thank you for creating an account with ${BRAND.name}. Please confirm your email address by clicking the button below:</p>
        <p style="margin: 24px 0;"><a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Confirm Email Address</a></p>
        <p style="color: #78716c; font-size: 14px; margin-top: 30px;">If you did not register for an account, please ignore this email.</p>
      </div>
    `,
    text: `Verify your email for ${BRAND.name}: ${verificationLink}`,
  });
}

export async function sendResetPasswordEmail(to: string, resetLink: string) {
  return sendEmail({
    to,
    subject: `Reset your ${BRAND.name} password`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. Click the link below to choose a new password:</p>
        <p style="margin: 24px 0;"><a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a></p>
        <p style="color: #78716c; font-size: 14px; margin-top: 30px;">If you did not request a password reset, your credentials remain secure and you can ignore this email.</p>
      </div>
    `,
    text: `Reset your password for ${BRAND.name}: ${resetLink}`,
  });
}

export async function sendAnalysisReadyEmail(to: string, projectName: string, projectUrl: string) {
  return sendEmail({
    to,
    subject: `Architectural Analysis Ready: ${projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Analysis Complete</h2>
        <p>Your architectural analysis for <strong>${projectName}</strong> is ready for review.</p>
        <p>The technical report details route topologies, detected components, complexity tier, and clean-room implementation estimates.</p>
        <p style="margin: 24px 0;"><a href="${projectUrl}" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">View Technical Report &amp; Quote</a></p>
      </div>
    `,
    text: `Analysis complete for ${projectName}. View report and quote: ${projectUrl}`,
  });
}

export async function sendQuoteReadyEmail(params: {
  to: string;
  projectName: string;
  quoteUrl: string;
  estimatedHours: number;
  amountCents: number;
}) {
  const { to, projectName, quoteUrl, estimatedHours, amountCents } = params;
  const priceFormatted = `$${(amountCents / 100).toFixed(2)}`;

  return sendEmail({
    to,
    subject: `Rebuild Quote Ready: ${projectName} (${priceFormatted})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Clean-Room Rebuild Quote</h2>
        <p>A formal quote has been generated for <strong>${projectName}</strong> based on measured technical scope.</p>
        <div style="background-color: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 6px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Estimated Scope:</strong> ${estimatedHours} engineering hours</p>
          <p style="margin: 0; font-size: 18px;"><strong>Clean-Room Price:</strong> <span style="color: #c2410c; font-weight: bold;">${priceFormatted}</span> (50% market benchmark)</p>
        </div>
        <p style="margin: 24px 0;"><a href="${quoteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Review Quote &amp; Attestation</a></p>
      </div>
    `,
    text: `Quote ready for ${projectName}: ${priceFormatted} (${estimatedHours} hrs). Review: ${quoteUrl}`,
  });
}

export async function sendPaymentReceivedEmail(params: {
  to: string;
  projectName: string;
  orderId: string;
  amountCents: number;
  dashboardUrl: string;
}) {
  const { to, projectName, orderId, amountCents, dashboardUrl } = params;
  const priceFormatted = `$${(amountCents / 100).toFixed(2)}`;

  return sendEmail({
    to,
    subject: `Payment Confirmed: Order #${orderId.slice(0, 8)}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Payment Received</h2>
        <p>Thank you. Your payment of <strong>${priceFormatted}</strong> for <strong>${projectName}</strong> has been confirmed.</p>
        <p>Your build job has been queued in our isolated worker pool. You can monitor progress and live build iterations from your project workspace.</p>
        <p style="margin: 24px 0;"><a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Track Build Progress</a></p>
      </div>
    `,
    text: `Payment confirmed for ${projectName}: ${priceFormatted}. Track build: ${dashboardUrl}`,
  });
}

export async function sendBuildStartedEmail(params: {
  to: string;
  projectName: string;
  jobId: string;
  trackingUrl: string;
}) {
  const { to, projectName, jobId, trackingUrl } = params;

  return sendEmail({
    to,
    subject: `Synthesis Started: ${projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Build Execution In Progress</h2>
        <p>The clean-room synthesizer has initiated code generation for <strong>${projectName}</strong> (Job #${jobId.slice(0, 8)}).</p>
        <p>The builder agent will iteratively construct, compile, and execute sandbox parity verification passes.</p>
        <p style="margin: 24px 0;"><a href="${trackingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Open Live Dashboard</a></p>
      </div>
    `,
    text: `Build started for ${projectName}. Track live: ${trackingUrl}`,
  });
}

export async function sendBuildFailedRefundedEmail(params: {
  to: string;
  projectName: string;
  jobId: string;
  refundCreditsCents: number;
  supportUrl: string;
}) {
  const { to, projectName, jobId, refundCreditsCents, supportUrl } = params;
  const refundFormatted = `$${(refundCreditsCents / 100).toFixed(2)}`;

  return sendEmail({
    to,
    subject: `Build Notification: ${projectName} & Platform Refund`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Build Incomplete &amp; Refund Issued</h2>
        <p>The automated build engine encountered an unresolvable compilation or parity obstacle on <strong>${projectName}</strong> (Job #${jobId.slice(0, 8)}).</p>
        <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; padding: 16px; margin: 16px 0; color: #991b1b;">
          <p style="margin: 0;"><strong>Platform Credits Refunded:</strong> ${refundFormatted} has been credited to your workspace ledger.</p>
        </div>
        <p>Our on-call systems team has been notified. You can review your ledger balance or request architectural triage assistance:</p>
        <p style="margin: 24px 0;"><a href="${supportUrl}" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Contact Engineering Support</a></p>
      </div>
    `,
    text: `Build incomplete for ${projectName}. Platform credits of ${refundFormatted} have been refunded to your ledger. Support: ${supportUrl}`,
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
    subject: `Delivery Ready: ${projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Your Clean-Room Delivery is Ready</h2>
        <p>The verified archive for <strong>${projectName}</strong> is available in your workspace.</p>
        ${versionLabel ? `<p>Version: <strong>${versionLabel}</strong></p>` : ""}
        ${digestLine}
        <p style="margin: 24px 0;"><a href="${deliveryUrl}" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Download Package &amp; Git Repository</a></p>
        <p style="color: #78716c; font-size: 14px; margin-top: 30px;">The email links to your authenticated workspace. It does not contain a long-lived storage credential.</p>
      </div>
    `,
    text: `Delivery ready for ${projectName}.${versionLabel ? ` Version: ${versionLabel}.` : ""} ${textDigest} Open: ${deliveryUrl}`,
  });
}

export async function sendBuildFinishedEmail(to: string, projectName: string, downloadUrl: string) {
  return sendDeliveryReadyEmail({
    to,
    projectName,
    deliveryUrl: downloadUrl,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
}

export async function sendStudioTokensLowEmail(params: {
  to: string;
  workspaceName: string;
  remainingCreditsCents: number;
  topupUrl: string;
  unsubscribeUrl?: string;
}) {
  const { to, workspaceName, remainingCreditsCents, topupUrl, unsubscribeUrl } = params;
  const balanceFormatted = `$${(remainingCreditsCents / 100).toFixed(2)}`;

  return sendEmail({
    to,
    subject: `Studio Credits Low: ${workspaceName} (${balanceFormatted} remaining)`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Studio Credits Notice</h2>
        <p>Your workspace <strong>${workspaceName}</strong> has <strong>${balanceFormatted}</strong> remaining in platform credits.</p>
        <p>To avoid interruptions while making edits in RevForge Studio, top up your credit ledger:</p>
        <p style="margin: 24px 0;"><a href="${topupUrl}" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Top Up Credits</a></p>
        ${
          unsubscribeUrl
            ? `<p style="color: #a8a29e; font-size: 12px; margin-top: 36px; border-top: 1px solid #e7e5e4; padding-top: 12px;">To stop receiving balance alert notifications, <a href="${unsubscribeUrl}" style="color: #78716c;">unsubscribe here</a>.</p>`
            : ""
        }
      </div>
    `,
    text: `Studio credits low for ${workspaceName}: ${balanceFormatted} remaining. Top up: ${topupUrl}`,
  });
}

export async function sendDeliveryExpiringEmail(params: {
  to: string;
  projectName: string;
  expiresAt: Date;
  deliveryUrl: string;
}) {
  const { to, projectName, expiresAt, deliveryUrl } = params;
  const formattedDate = expiresAt.toLocaleDateString();

  return sendEmail({
    to,
    subject: `Delivery Retention Notice: ${projectName} expires ${formattedDate}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Delivery Retention Expiring</h2>
        <p>The download bundle and git bundle for <strong>${projectName}</strong> are scheduled for lifecycle expiration on <strong>${formattedDate}</strong> per our 30-day retention policy.</p>
        <p>Please download and backup your repository archives before this date:</p>
        <p style="margin: 24px 0;"><a href="${deliveryUrl}" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Download Archive Now</a></p>
      </div>
    `,
    text: `Delivery archive for ${projectName} expires on ${formattedDate}. Download: ${deliveryUrl}`,
  });
}
