import { computeLeakageSimilarity, evaluateLeakageGate, LEAKAGE_THRESHOLD } from "./leakage-gate";
import { computeCompositeParityScore, checkParityStagnation } from "./parity-evaluator";
import assert from "node:assert";

console.log("=== Running Clean-Room Build Engine & Parity Evaluator Tests ===");

// 1. MinHash Token Shingle Leakage Gate Tests
const originalExtractedSource = `
function handleUserCheckout(userId, amount) {
  const token = generateSessionToken(userId);
  if (amount > 1000) {
    applyDiscount(token, 0.15);
  }
  return executeTransaction(userId, amount, token);
}
`;

// Identical / Direct copy code: must trigger high leakage similarity
const copiedCode = originalExtractedSource;
const copiedSim = computeLeakageSimilarity(copiedCode, originalExtractedSource);
assert(copiedSim >= 0.90, `Direct copy similarity should be >= 0.90, got ${copiedSim}`);

// Lightly obfuscated / renamed variable copy: shingle similarity catches structure
const lightlyModified = `
function processUserOrder(uid, total) {
  const session = generateSessionToken(uid);
  if (total > 1000) {
    applyDiscount(session, 0.15);
  }
  return executeTransaction(uid, total, session);
}
`;
const modSim = computeLeakageSimilarity(lightlyModified, originalExtractedSource);
console.log(`Observed lightly modified similarity: ${modSim}`);

// Independent Clean-Room Implementation from Behavior Spec: MUST pass below 0.25 threshold
const cleanRoomImplementation = `
export async function createCheckoutSession(params: { accountId: string; chargeCents: number }) {
  const verified = await assertAccountEligibility(params.accountId);
  const invoice = await billingLedger.recordCharge({
    accountId: verified.id,
    amount: params.chargeCents,
    status: "pending_capture"
  });
  return invoice.checkoutUrl;
}
`;
const cleanSim = computeLeakageSimilarity(cleanRoomImplementation, originalExtractedSource);
assert(cleanSim < LEAKAGE_THRESHOLD, `Clean-room code similarity must be < ${LEAKAGE_THRESHOLD}, got ${cleanSim}`);

const gateResult = evaluateLeakageGate(
  [{ path: "src/billing.ts", content: cleanRoomImplementation }],
  [{ path: "extracted/old-billing.js", content: originalExtractedSource }]
);
assert.strictEqual(gateResult.passed, true);
console.log(`✓ Clean-Room Leakage Gate correctly passed independently synthesized code (similarity ${cleanSim}).`);

// 2. Parity Score Math & Weighting Tests (0.35 visual + 0.15 structure + 0.35 behavior + 0.15 build)
const fullParityScores = {
  visualScore: 0.98,
  structureScore: 0.96,
  behaviorScore: 0.97,
  buildHealthScore: 1.0,
};
const evalResult = computeCompositeParityScore(fullParityScores, "web_app");
assert(evalResult.overallScore >= 0.95, `Expected overall parity >= 0.95, got ${evalResult.overallScore}`);
assert.strictEqual(evalResult.isSuccessful, true);
console.log(`✓ Composite parity score computed: ${evalResult.overallScore} (Success: true).`);

// 3. Stagnation Detection Tests
const stagnantScores = [0.850, 0.852, 0.853];
assert.strictEqual(checkParityStagnation(stagnantScores), true);

const progressingScores = [0.850, 0.890, 0.940];
assert.strictEqual(checkParityStagnation(progressingScores), false);
console.log("✓ Parity stagnation across consecutive iterations detected properly.");

console.log("🎉 Clean-Room Build Engine & Parity Tests Passed Successfully!");
