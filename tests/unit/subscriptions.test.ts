import { describe, it, expect } from "vitest";
import {
  planGrantForPeriod,
  nextSubscriptionState,
  SubscriptionState,
  SubscriptionEvent,
} from "@/lib/billing/subscriptions";

describe("planGrantForPeriod", () => {
  const plan = {
    id: "pro",
    monthlyCreditsCents: 7000, // 70,000 credits ($70)
    rolloverCapCents: 14000, // 140,000 credits ($140)
  };
  const periodStart = new Date("2026-10-01T00:00:00Z");

  it("grants full monthly credits when balance is zero and not yet granted", () => {
    const res = planGrantForPeriod({
      plan,
      periodStart,
      grants: [],
      balanceCents: 0,
    });
    expect(res.grantCents).toBe(7000);
  });

  it("returns 0 if a grant for periodStart already exists (idempotency)", () => {
    const res = planGrantForPeriod({
      plan,
      periodStart,
      grants: [{ periodStart }],
      balanceCents: 1000,
    });
    expect(res.grantCents).toBe(0);
  });

  it("caps grant to rollover headroom when balance is near cap", () => {
    // Current balance 10,000 cents. Rollover cap is 14,000 cents.
    // Headroom is 4,000 cents (< 7,000 monthly credits).
    const res = planGrantForPeriod({
      plan,
      periodStart,
      grants: [],
      balanceCents: 10000,
    });
    expect(res.grantCents).toBe(4000);
  });

  it("returns 0 if current balance is already at or above rollover cap", () => {
    const res = planGrantForPeriod({
      plan,
      periodStart,
      grants: [],
      balanceCents: 15000,
    });
    expect(res.grantCents).toBe(0);
  });
});

describe("nextSubscriptionState state machine", () => {
  it("transitions active to past_due on payment_failed", () => {
    expect(nextSubscriptionState("active", "payment_failed")).toBe("past_due");
  });

  it("recovers past_due to active on payment_succeeded", () => {
    expect(nextSubscriptionState("past_due", "payment_succeeded")).toBe("active");
  });

  it("transitions past_due to paused on grace_expired", () => {
    expect(nextSubscriptionState("past_due", "grace_expired")).toBe("paused");
  });

  it("remains canceled unless reactivated", () => {
    expect(nextSubscriptionState("canceled", "payment_succeeded")).toBe("canceled");
    expect(nextSubscriptionState("canceled", "payment_failed")).toBe("canceled");
    expect(nextSubscriptionState("canceled", "resumed")).toBe("canceled");
    expect(nextSubscriptionState("canceled", "activated")).toBe("active");
  });

  it("ignores unknown or irrelevant events without changing state", () => {
    expect(nextSubscriptionState("active", "payment_succeeded")).toBe("active");
    expect(nextSubscriptionState("trialing", "unknown_event" as SubscriptionEvent)).toBe("trialing");
  });
});
