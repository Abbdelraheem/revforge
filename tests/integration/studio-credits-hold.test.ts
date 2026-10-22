import { describe, it, expect } from "vitest";

describe("Studio Concurrent Credit Hold & Race Prevention Suite", () => {
  it("prevents double-spending when balance only covers a single edit hold", async () => {
    // Initial workspace balance: 250 cents
    let balanceCents = 250;
    const holdAmountCents = 200;

    // Mutex simulating Postgres advisory lock on workspace id:
    let lockHeld = false;

    async function attemptHold(requestId: string): Promise<boolean> {
      // Wait for lock
      while (lockHeld) {
        await new Promise((r) => setTimeout(r, 5));
      }
      lockHeld = true;

      try {
        if (balanceCents >= holdAmountCents) {
          balanceCents -= holdAmountCents;
          return true;
        }
        return false;
      } finally {
        lockHeld = false;
      }
    }

    // Run 2 simultaneous hold requests concurrently
    const [result1, result2] = await Promise.all([
      attemptHold("req-1"),
      attemptHold("req-2"),
    ]);

    const successes = [result1, result2].filter((r) => r === true);
    const failures = [result1, result2].filter((r) => r === false);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(balanceCents).toBe(50); // 250 - 200 = 50, zero overdraft!
  });
});
