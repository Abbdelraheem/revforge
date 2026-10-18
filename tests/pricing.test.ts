import assert from "node:assert";
import {
  calculateDynamicProjectQuote,
  roundToCleanPrice,
} from "../src/lib/pricing/pricing-engine";
import { verifyPaddleWebhookSignature } from "../src/lib/paddle/paddle-client";
import crypto from "node:crypto";

console.log("[PRICING_SUITE] Running Pricing & Payment Webhook Tests...");

// 1. Clean rounding
assert.strictEqual(roundToCleanPrice(29), 29);
assert.strictEqual(roundToCleanPrice(49), 49);
assert.strictEqual(roundToCleanPrice(145), 149);
assert.strictEqual(roundToCleanPrice(245), 249);
assert.strictEqual(roundToCleanPrice(495), 499);

// 2. 90% margin verification
const webAppQuote = calculateDynamicProjectQuote("quote-web", "web_app");
assert.strictEqual(webAppQuote.targetPriceUsd, 49);
assert.ok(webAppQuote.profitMarginPercent >= 90);
assert.strictEqual(webAppQuote.milestones.length, 5);

const saasQuote = calculateDynamicProjectQuote("quote-saas", "enterprise_saas");
assert.strictEqual(saasQuote.targetPriceUsd, 499);
assert.ok(saasQuote.profitMarginPercent >= 90);

// 3. Paddle Webhook Signature verification
const mockSecret = "pdl_test_secret_key_123456";
const mockBody = JSON.stringify({ event_type: "transaction.completed", data: { id: "txn_test" } });
const ts = Math.floor(Date.now() / 1000).toString();
const validH1 = crypto.createHmac("sha256", mockSecret).update(`${ts}:${mockBody}`).digest("hex");
const validHeader = `ts=${ts};h1=${validH1}`;

assert.strictEqual(verifyPaddleWebhookSignature(mockBody, validHeader, mockSecret), true);
assert.strictEqual(verifyPaddleWebhookSignature(mockBody.replace("txn_test", "txn_evil"), validHeader, mockSecret), false);

console.log("  ✓ All Pricing & Payment Tests Passed Successfully.\n");
