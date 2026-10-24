import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendVerifyEmail,
  sendResetPasswordEmail,
  sendAnalysisReadyEmail,
  sendQuoteReadyEmail,
  sendPaymentReceivedEmail,
  sendBuildStartedEmail,
  sendBuildFailedRefundedEmail,
  sendDeliveryReadyEmail,
  sendStudioTokensLowEmail,
  sendDeliveryExpiringEmail,
} from "@/lib/email/send";

describe("Email Lifecycle Dispatchers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats and dispatches sendVerifyEmail", async () => {
    const res = await sendVerifyEmail("user@example.com", "https://revforge.ai/verify?token=123");
    expect(res.success).toBe(true);
    expect(res.id).toBeDefined();
  });

  it("formats and dispatches sendResetPasswordEmail", async () => {
    const res = await sendResetPasswordEmail("user@example.com", "https://revforge.ai/reset?token=abc");
    expect(res.success).toBe(true);
  });

  it("formats and dispatches sendAnalysisReadyEmail", async () => {
    const res = await sendAnalysisReadyEmail("user@example.com", "Acme App", "https://revforge.ai/projects/1");
    expect(res.success).toBe(true);
  });

  it("formats and dispatches sendQuoteReadyEmail with price calculation", async () => {
    const res = await sendQuoteReadyEmail({
      to: "user@example.com",
      projectName: "Acme App",
      quoteUrl: "https://revforge.ai/projects/1",
      estimatedHours: 24,
      amountCents: 72000,
    });
    expect(res.success).toBe(true);
  });

  it("formats and dispatches sendPaymentReceivedEmail", async () => {
    const res = await sendPaymentReceivedEmail({
      to: "user@example.com",
      projectName: "Acme App",
      orderId: "ord-1234567890",
      amountCents: 72000,
      dashboardUrl: "https://revforge.ai/projects/1",
    });
    expect(res.success).toBe(true);
  });

  it("formats and dispatches sendBuildStartedEmail", async () => {
    const res = await sendBuildStartedEmail({
      to: "user@example.com",
      projectName: "Acme App",
      jobId: "job-9876543210",
      trackingUrl: "https://revforge.ai/projects/1",
    });
    expect(res.success).toBe(true);
  });

  it("formats and dispatches sendBuildFailedRefundedEmail", async () => {
    const res = await sendBuildFailedRefundedEmail({
      to: "user@example.com",
      projectName: "Acme App",
      jobId: "job-failed",
      refundCreditsCents: 72000,
      supportUrl: "https://revforge.ai/contact",
    });
    expect(res.success).toBe(true);
  });

  it("formats and dispatches sendDeliveryReadyEmail with SHA-256 and size", async () => {
    const res = await sendDeliveryReadyEmail({
      to: "user@example.com",
      projectName: "Acme App",
      deliveryUrl: "https://revforge.ai/projects/1/delivery",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      sizeBytes: 1048576,
      expiresAt: new Date(Date.now() + 30 * 86400000),
      versionLabel: "v1.0.0",
    });
    expect(res.success).toBe(true);
  });

  it("formats and dispatches sendStudioTokensLowEmail with unsubscribe", async () => {
    const res = await sendStudioTokensLowEmail({
      to: "user@example.com",
      workspaceName: "Acme Workspace",
      remainingCreditsCents: 150,
      topupUrl: "https://revforge.ai/billing",
      unsubscribeUrl: "https://revforge.ai/api/user/unsubscribe",
    });
    expect(res.success).toBe(true);
  });

  it("formats and dispatches sendDeliveryExpiringEmail", async () => {
    const res = await sendDeliveryExpiringEmail({
      to: "user@example.com",
      projectName: "Acme App",
      expiresAt: new Date(Date.now() + 7 * 86400000),
      deliveryUrl: "https://revforge.ai/projects/1/delivery",
    });
    expect(res.success).toBe(true);
  });
});
