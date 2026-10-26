/**
 * Pure Subscription Engine & State Machine
 *
 * Implements deterministic subscription credit granting with rollover limits,
 * and Paddle webhook state transitions.
 */

export type SubscriptionPlanId = "starter" | "pro" | "team";

export interface SubscriptionPlanDef {
  id: SubscriptionPlanId;
  name: string;
  priceMonthlyUsd: number;
  priceAnnualUsd: number;
  monthlyCreditsCents: number; // Stored in integer cents: $25 = 2500 cents (25,000 credits)
  rolloverCapCents: number; // 2x monthly credits
  description: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlanDef> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthlyUsd: 19,
    priceAnnualUsd: 190, // 2 months free (10x monthly)
    monthlyCreditsCents: 2500, // 25,000 credits ($25 value)
    rolloverCapCents: 5000, // 50,000 credits
    description: "Ideal for individual builders and solo founders.",
    features: [
      "25,000 Monthly Credits ($25 value)",
      "Unused credits roll over (up to 50,000)",
      "Spendable on flat clone builds & Studio",
      "Clean-room Next.js 15 source code",
      "Full commercial use rights",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: 49,
    priceAnnualUsd: 490,
    monthlyCreditsCents: 7000, // 70,000 credits ($70 value)
    rolloverCapCents: 14000, // 140,000 credits
    description: "Designed for active engineers and growing startups.",
    features: [
      "70,000 Monthly Credits ($70 value)",
      "Unused credits roll over (up to 140,000)",
      "Spendable on flat clone builds & Studio",
      "Priority clean-room synthesis queue",
      "Fast Studio iterative refinements",
    ],
  },
  team: {
    id: "team",
    name: "Team",
    priceMonthlyUsd: 149,
    priceAnnualUsd: 1490,
    monthlyCreditsCents: 23000, // 230,000 credits ($230 value)
    rolloverCapCents: 46000, // 460,000 credits
    description: "For agencies and development teams shipping multi-system architectures.",
    features: [
      "230,000 Monthly Credits ($230 value)",
      "Unused credits roll over (up to 460,000)",
      "Multi-seat workspace access",
      "Dedicated build agent concurrency",
      "Direct engineer support channel",
    ],
  },
};

export interface PlanGrantInput {
  plan: {
    id: string;
    monthlyCreditsCents: number;
    rolloverCapCents: number;
  };
  periodStart: Date;
  grants: Array<{ periodStart: Date }>;
  balanceCents: number;
}

export function planGrantForPeriod(input: PlanGrantInput): { grantCents: number } {
  const periodStartMs = input.periodStart.getTime();
  const alreadyGranted = input.grants.some(
    (g) => g.periodStart.getTime() === periodStartMs
  );

  if (alreadyGranted) {
    return { grantCents: 0 };
  }

  const headroom = Math.max(0, input.plan.rolloverCapCents - input.balanceCents);
  const grantCents = Math.min(input.plan.monthlyCreditsCents, headroom);

  return { grantCents };
}

export type SubscriptionState =
  | "active"
  | "past_due"
  | "canceled"
  | "paused"
  | "trialing";

export type SubscriptionEvent =
  | "activated"
  | "payment_failed"
  | "payment_succeeded"
  | "canceled"
  | "resumed"
  | "expired"
  | "grace_expired";

export function nextSubscriptionState(
  state: SubscriptionState,
  event: SubscriptionEvent
): SubscriptionState {
  if (state === "canceled" && event !== "activated") {
    return "canceled";
  }

  switch (event) {
    case "activated":
      return "active";
    case "payment_failed":
      return state === "active" ? "past_due" : state;
    case "payment_succeeded":
      return state === "past_due" ? "active" : state;
    case "canceled":
      return "canceled";
    case "resumed":
      return "active";
    case "expired":
      return "canceled";
    case "grace_expired":
      return state === "past_due" ? "paused" : state;
    default:
      return state;
  }
}
