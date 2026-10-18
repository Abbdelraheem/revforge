import crypto from "node:crypto";

export class PaddleSecurityError extends Error {
  constructor(message: string) {
    super(`[PADDLE_SECURITY_ERROR] ${message}`);
    this.name = "PaddleSecurityError";
  }
}

export interface PaddleTransactionItem {
  name: string;
  category: string;
  amountUsd: number;
}

export interface PaddleCreateTransactionResult {
  transactionId: string;
  checkoutUrl: string;
  status: string;
  isSandboxMock?: boolean;
}

/**
 * Cryptographically verifies Paddle v2 webhook signature.
 * Header format: ts=1671552777;h1=04859a72b070...
 * Message to hash: `${ts}:${rawBody}`
 * Algorithm: HMAC-SHA256 with PADDLE_WEBHOOK_SECRET_KEY
 */
export function verifyPaddleWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secretKey: string,
  maxAgeSeconds: number = 300 // 5 minutes replay protection
): boolean {
  if (!signatureHeader || !secretKey) {
    throw new PaddleSecurityError("Missing signature header or webhook secret key.");
  }

  // Parse ts and h1 components
  const parts = signatureHeader.split(";").reduce((acc, part) => {
    const [key, val] = part.split("=");
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
  }, {} as Record<string, string>);

  const ts = parts.ts;
  const h1 = parts.h1;

  if (!ts || !h1) {
    throw new PaddleSecurityError("Invalid Paddle-Signature header format. Expected 'ts=...;h1=...'");
  }

  // Replay attack prevention: check timestamp drift
  const timestampNum = parseInt(ts, 10);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTimestamp - timestampNum) > maxAgeSeconds) {
    throw new PaddleSecurityError("Webhook signature timestamp is expired or outside the allowed window.");
  }

  // Compute expected HMAC-SHA256
  const payloadToSign = `${ts}:${rawBody}`;
  const computedH1 = crypto
    .createHmac("sha256", secretKey)
    .update(payloadToSign, "utf8")
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  const computedBuf = Buffer.from(computedH1, "hex");
  const receivedBuf = Buffer.from(h1, "hex");

  if (computedBuf.length !== receivedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuf, receivedBuf);
}

/**
 * Creates a Paddle v2 Transaction for clean-room reverse engineering.
 * Uses official Paddle v2 API or returns simulated sandbox checkout if no API key is provided.
 */
export async function createPaddleTransaction(
  projectId: string,
  targetType: string,
  items: PaddleTransactionItem[],
  totalAmountUsd: number,
  host: string
): Promise<PaddleCreateTransactionResult> {
  const apiKey = process.env.PADDLE_API_KEY;
  const environment = process.env.PADDLE_ENVIRONMENT || "sandbox";
  const baseUrl =
    environment === "production"
      ? "https://api.paddle.com"
      : "https://sandbox-api.paddle.com";

  const protocol = host.includes("localhost") ? "http" : "https";
  const returnUrl = `${protocol}://${host}?project_id=${projectId}&payment=success`;

  if (apiKey) {
    try {
      const lineItems = items.map((item) => ({
        price: {
          description: item.name,
          unit_price: {
            currency_code: "USD",
            amount: Math.round(item.amountUsd * 100).toString(), // Paddle expects string in minor units (cents)
          },
          product: {
            name: `RevForge Rebuild: ${item.name}`,
            tax_category: "standard",
          },
        },
        quantity: 1,
      }));

      const response = await fetch(`${baseUrl}/transactions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Paddle-Version": "1",
        },
        body: JSON.stringify({
          items: lineItems,
          custom_data: {
            projectId,
            targetType,
            totalPlatformPriceUsd: totalAmountUsd,
          },
          checkout: {
            url: returnUrl,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Paddle API transaction creation failed.");
      }

      const data = await response.json();
      return {
        transactionId: data.data.id,
        checkoutUrl: data.data.checkout?.url || `${returnUrl}&txn=${data.data.id}`,
        status: data.data.status,
      };
    } catch (err: any) {
      console.warn(`[PADDLE_API_WARN] Falling back to local sandbox: ${err.message}`);
    }
  }

  // Local sandbox mode for developer preview
  const mockTransactionId = `txn_${environment}_${Date.now()}`;
  return {
    transactionId: mockTransactionId,
    checkoutUrl: `${returnUrl}&txn=${mockTransactionId}`,
    status: "draft",
    isSandboxMock: true,
  };
}
