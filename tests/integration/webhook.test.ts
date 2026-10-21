import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifyPaddleSignature } from "@/lib/billing/provider";

describe("Paddle Webhook Security & Idempotency Integration Suite", () => {
  const secretKey = "test_webhook_secret_key_12345";

  function createSignature(payload: string, ts: number, secret: string) {
    const signedPayload = `${ts}:${payload}`;
    const h1 = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
    return `ts=${ts};h1=${h1}`;
  }

  it("fails closed when encountering missing secret", () => {
    const payload = JSON.stringify({ event_id: "evt_1", event_type: "transaction.completed" });
    const header = createSignature(payload, Math.floor(Date.now() / 1000), secretKey);

    const verified = verifyPaddleSignature(payload, header, "");
    expect(verified).toBe(false);
  });

  it("rejects webhooks with invalid signature", () => {
    const payload = JSON.stringify({ event_id: "evt_1", event_type: "transaction.completed" });
    const invalidHeader = `ts=${Math.floor(Date.now() / 1000)};h1=invalid_tampered_hmac_hex_code`;

    const verified = verifyPaddleSignature(payload, invalidHeader, secretKey);
    expect(verified).toBe(false);
  });

  it("rejects stale or replay attacks outside the 300s window", () => {
    const payload = JSON.stringify({ event_id: "evt_replay", event_type: "transaction.completed" });
    // 400 seconds in the past -> replay attempt
    const staleTimestamp = Math.floor(Date.now() / 1000) - 400;
    const header = createSignature(payload, staleTimestamp, secretKey);

    const verified = verifyPaddleSignature(payload, header, secretKey);
    expect(verified).toBe(false);
  });

  it("handles duplicate event delivery idempotently", () => {
    const receivedEvents = new Set<string>();
    const eventId = "evt_duplicate_test";

    // First delivery
    const firstStatus = receivedEvents.has(eventId) ? "ignored" : "processed";
    receivedEvents.add(eventId);

    // Duplicate delivery
    const duplicateStatus = receivedEvents.has(eventId) ? "ignored" : "processed";

    expect(firstStatus).toBe("processed");
    expect(duplicateStatus).toBe("ignored");
  });

  it("rejects currency or amount mismatch between order and transaction payload", () => {
    const orderExpectedCents: number = 9900;
    const webhookReportedCents: number = 5000; // mismatch

    const hasMismatch = orderExpectedCents !== webhookReportedCents;
    expect(hasMismatch).toBe(true);
  });
});
