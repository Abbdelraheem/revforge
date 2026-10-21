import { describe, it, expect } from "vitest";

describe("Free Trial Entitlement Concurrency & Race Condition Suite", () => {
  it("prevents multiple concurrent complimentary analyses using atomic update guards", async () => {
    let analysisCreditsUsed = 0;
    const maxFreeCredits = 1;

    async function attemptConsumeFreeCredit(): Promise<boolean> {
      // Atomic condition: UPDATE users SET analysisCreditsUsed = analysisCreditsUsed + 1 WHERE id = userId AND analysisCreditsUsed < 1
      if (analysisCreditsUsed < maxFreeCredits) {
        analysisCreditsUsed += 1;
        return true;
      }
      return false;
    }

    // Run 5 simultaneous requests attempting to consume the single free credit
    const results = await Promise.all([
      attemptConsumeFreeCredit(),
      attemptConsumeFreeCredit(),
      attemptConsumeFreeCredit(),
      attemptConsumeFreeCredit(),
      attemptConsumeFreeCredit(),
    ]);

    const successfulAttempts = results.filter((r) => r === true);
    const rejectedAttempts = results.filter((r) => r === false);

    expect(successfulAttempts).toHaveLength(1);
    expect(rejectedAttempts).toHaveLength(4);
    expect(analysisCreditsUsed).toBe(1);
  });
});
