import crypto from "node:crypto";
import { PaymentProvider, CheckoutInput, CheckoutResult, ParsedWebhook } from "./types";
import { env } from "@/env";

/**
 * Fake Payment Provider for local dev and CI.
 * Strictly forbidden in production.
 */
export class FakePaymentProvider implements PaymentProvider {
  name: "fake" = "fake";

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (env.NODE_ENV === "production") {
      throw new Error("FakePaymentProvider is strictly forbidden in production.");
    }

    const providerTxnId = `fake_txn_${crypto.randomUUID()}`;
    const checkoutUrl = `/dev/fake-checkout?orderId=${input.orderId}&txnId=${providerTxnId}&amount=${input.amountCents}`;

    return { providerTxnId, checkoutUrl };
  }

  verifyAndParseWebhook(rawBody: string, headers: Headers): ParsedWebhook {
    if (env.NODE_ENV === "production") {
      throw new Error("FakePaymentProvider is strictly forbidden in production.");
    }

    const signature = headers.get("x-fake-signature");
    const secret = env.FAKE_WEBHOOK_SECRET;

    if (!secret) {
      throw new Error("missing_fake_webhook_secret");
    }

    if (!signature) {
      throw new Error("missing_signature");
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new Error("invalid_signature");
    }

    const payload = JSON.parse(rawBody);

    return {
      id: payload.event_id || `evt_${crypto.randomUUID()}`,
      type: payload.event_type || "transaction.completed",
      orderId: payload.data?.custom_data?.orderId || "",
      providerTxnId: payload.data?.id || "",
      subtotalCents: payload.data?.details?.totals?.subtotal ?? 0,
      currency: payload.data?.currency_code || "USD",
      raw: rawBody,
      subscriptionId: payload.data?.subscription_id || payload.data?.id,
      workspaceId: payload.data?.custom_data?.workspaceId,
      customerId: payload.data?.customer_id,
      planId: payload.data?.custom_data?.planId || payload.data?.items?.[0]?.price?.id,
      periodStart: payload.data?.current_billing_period?.starts_at,
      periodEnd: payload.data?.current_billing_period?.ends_at,
      data: payload.data,
    };
  }
}

/**
 * Standalone verification function for Paddle Webhook HMAC signatures
 * Returns boolean false on signature failure or replay attacks outside 300s
 */
export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secretKey: string
): boolean {
  if (!signatureHeader || !secretKey) {
    return false;
  }
  try {
    const parts = signatureHeader.split(";").reduce((acc, part) => {
      const [key, val] = part.split("=");
      if (key && val) acc[key.trim()] = val.trim();
      return acc;
    }, {} as Record<string, string>);

    const ts = parts["ts"];
    const h1 = parts["h1"];
    if (!ts || !h1) return false;

    const tsNum = parseInt(ts, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - tsNum) > 300) {
      return false;
    }

    const expectedHmac = crypto
      .createHmac("sha256", secretKey)
      .update(`${ts}:${rawBody}`)
      .digest("hex");

    const sigBuf = Buffer.from(h1, "hex");
    const expBuf = Buffer.from(expectedHmac, "hex");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Production Paddle Billing Provider
 */
export class PaddleProvider implements PaymentProvider {
  name: "paddle" = "paddle";

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const apiKey = env.PADDLE_API_KEY;
    if (!apiKey) {
      throw new Error("PADDLE_API_KEY is not configured.");
    }

    const baseUrl =
      env.PADDLE_ENVIRONMENT === "sandbox"
        ? "https://sandbox-api.paddle.com"
        : "https://api.paddle.com";

    const response = await fetch(`${baseUrl}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            price: {
              description: input.description,
              unit_price: {
                amount: String(input.amountCents),
                currency_code: input.currency,
              },
              product: {
                name: "RevForge Clean-Room Rebuild",
                tax_category: "standard",
              },
            },
            quantity: 1,
          },
        ],
        customer: { email: input.customerEmail },
        custom_data: { orderId: input.orderId },
        checkout: { success_url: input.successUrl },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Paddle API Error: ${err}`);
    }

    const resJson = await response.json();
    const txnId = resJson.data.id;
    const checkoutUrl = resJson.data.checkout.url;

    return {
      providerTxnId: txnId,
      checkoutUrl,
    };
  }

  verifyAndParseWebhook(rawBody: string, headers: Headers): ParsedWebhook {
    const signatureHeader = headers.get("Paddle-Signature");
    const secretKey = process.env.PADDLE_WEBHOOK_SECRET_KEY || env.PADDLE_WEBHOOK_SECRET_KEY;

    if (!secretKey) {
      throw new Error("missing_paddle_secret");
    }

    if (!signatureHeader) {
      throw new Error("missing_paddle_signature_header");
    }

    // Parse 'ts=123456789;h1=abcdef...'
    const parts = signatureHeader.split(";").reduce((acc, part) => {
      const [key, val] = part.split("=");
      if (key && val) acc[key.trim()] = val.trim();
      return acc;
    }, {} as Record<string, string>);

    const ts = parts["ts"];
    const h1 = parts["h1"];

    if (!ts || !h1) {
      throw new Error("malformed_signature_header");
    }

    // Replay attack prevention: ±300 seconds tolerance
    const tsNum = parseInt(ts, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - tsNum) > 300) {
      throw new Error("timestamp_out_of_range");
    }

    // Verify HMAC-SHA256 over `${ts}:${rawBody}`
    const expectedHmac = crypto
      .createHmac("sha256", secretKey)
      .update(`${ts}:${rawBody}`)
      .digest("hex");

    const sigBuf = Buffer.from(h1, "hex");
    const expBuf = Buffer.from(expectedHmac, "hex");

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new Error("invalid_signature");
    }

    const payload = JSON.parse(rawBody);

    return {
      id: payload.event_id,
      type: payload.event_type,
      orderId: payload.data?.custom_data?.orderId || "",
      providerTxnId: payload.data?.id || "",
      subtotalCents: parseInt(payload.data?.details?.totals?.subtotal || "0", 10),
      currency: payload.data?.currency_code || "USD",
      raw: rawBody,
      subscriptionId: payload.data?.subscription_id || payload.data?.id,
      workspaceId: payload.data?.custom_data?.workspaceId,
      customerId: payload.data?.customer_id,
      planId: payload.data?.custom_data?.planId || payload.data?.items?.[0]?.price?.id,
      periodStart: payload.data?.current_billing_period?.starts_at,
      periodEnd: payload.data?.current_billing_period?.ends_at,
      data: payload.data,
    };
  }
}

export function signFakeWebhook(payload: any, secret = env.FAKE_WEBHOOK_SECRET): { body: string; signature: string } {
  if (!secret) {
    throw new Error("FAKE_WEBHOOK_SECRET is not configured");
  }
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return { body, signature };
}

/**
 * Returns active PaymentProvider based on configuration
 */
export function getPaymentProvider(): PaymentProvider {
  if (env.PAYMENT_PROVIDER === "paddle") {
    return new PaddleProvider();
  }
  return new FakePaymentProvider();
}
