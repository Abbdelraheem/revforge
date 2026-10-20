import crypto from "node:crypto";
import { FakePaymentProvider, PaddleProvider } from "./provider";
import assert from "node:assert";

console.log("=== Running Payments & Webhook Test Matrix ===");

// 1. Fake Provider webhook verification (Valid)
const fakeProvider = new FakePaymentProvider();
const secret = "dev_fake_webhook_secret_key";
process.env.FAKE_WEBHOOK_SECRET = secret;

const validPayload = JSON.stringify({
  event_id: "evt_test_1001",
  event_type: "transaction.completed",
  data: {
    id: "fake_txn_1001",
    currency_code: "USD",
    custom_data: { orderId: "ord_1001" },
    details: { totals: { subtotal: 9900 } },
  },
});

const validSignature = crypto
  .createHmac("sha256", secret)
  .update(validPayload)
  .digest("hex");

const validHeaders = new Headers();
validHeaders.set("x-fake-signature", validSignature);

const parsed = fakeProvider.verifyAndParseWebhook(validPayload, validHeaders);
assert.strictEqual(parsed.id, "evt_test_1001");
assert.strictEqual(parsed.orderId, "ord_1001");
assert.strictEqual(parsed.subtotalCents, 9900);
console.log("✓ Valid webhook signature successfully verified.");

// 2. Bad Signature rejection
const badHeaders = new Headers();
badHeaders.set("x-fake-signature", "deadbeef000011112222333344445555");
assert.throws(
  () => fakeProvider.verifyAndParseWebhook(validPayload, badHeaders),
  /invalid_signature/,
  "Bad signature must throw error"
);
console.log("✓ Bad signature strictly rejected.");

// 3. Missing Signature rejection
const missingHeaders = new Headers();
assert.throws(
  () => fakeProvider.verifyAndParseWebhook(validPayload, missingHeaders),
  /missing_signature/,
  "Missing signature must throw error"
);
console.log("✓ Missing signature strictly rejected.");

// 4. Paddle Provider HMAC & Timestamp validation
const paddleProvider = new PaddleProvider();
process.env.PADDLE_WEBHOOK_SECRET_KEY = "pdl_secret_live_test";

const nowSec = Math.floor(Date.now() / 1000);
const paddlePayload = JSON.stringify({
  event_id: "evt_paddle_2002",
  event_type: "transaction.completed",
  data: {
    id: "txn_pdl_2002",
    currency_code: "USD",
    custom_data: { orderId: "ord_2002" },
    details: { totals: { subtotal: "19900" } },
  },
});

const paddleSigH1 = crypto
  .createHmac("sha256", "pdl_secret_live_test")
  .update(`${nowSec}:${paddlePayload}`)
  .digest("hex");

const paddleHeaders = new Headers();
paddleHeaders.set("Paddle-Signature", `ts=${nowSec};h1=${paddleSigH1}`);

const paddleParsed = paddleProvider.verifyAndParseWebhook(paddlePayload, paddleHeaders);
assert.strictEqual(paddleParsed.id, "evt_paddle_2002");
assert.strictEqual(paddleParsed.subtotalCents, 19900);
console.log("✓ Paddle Billing HMAC-SHA256 signature verified.");

// 5. Expired timestamp tolerance rejection (Replay attack)
const expiredTs = nowSec - 500; // 500 seconds ago (> 300s tolerance)
const expiredSigH1 = crypto
  .createHmac("sha256", "pdl_secret_live_test")
  .update(`${expiredTs}:${paddlePayload}`)
  .digest("hex");

const expiredHeaders = new Headers();
expiredHeaders.set("Paddle-Signature", `ts=${expiredTs};h1=${expiredSigH1}`);

assert.throws(
  () => paddleProvider.verifyAndParseWebhook(paddlePayload, expiredHeaders),
  /timestamp_out_of_range/,
  "Replay attack with old timestamp must throw error"
);
console.log("✓ Timestamp drift/replay attack prevention (>300s) strictly rejected.");

console.log("🎉 All Payments & Webhook tests completed successfully!");
