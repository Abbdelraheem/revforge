import {
  priceQuote,
  priceFeature,
  DEFAULT_PRICING_CONFIG_V1,
  type FeatureInput,
  type TierKey,
} from "./engine";

export type ComplexityTier = TierKey;

export interface Milestone {
  stepNumber: number;
  titleEn: string;
  deliverableEn: string;
  estimatedMinutes: number;
}

export function getReconstructionMilestones(tier: ComplexityTier): Milestone[] {
  return [
    {
      stepNumber: 1,
      titleEn: "UI Design & Component Extraction",
      deliverableEn: "Full responsive component hierarchy, typography, colors, and layout tokens.",
      estimatedMinutes: tier === "portfolio" ? 1 : tier === "web_app" ? 2 : 4,
    },
    {
      stepNumber: 2,
      titleEn: "API & Database Schema Synthesis",
      deliverableEn: "REST/GraphQL endpoints discovery, relational schema, typed contracts.",
      estimatedMinutes: tier === "portfolio" ? 1 : tier === "web_app" ? 3 : 6,
    },
    {
      stepNumber: 3,
      titleEn: "Clean-Room Business Engine Synthesis",
      deliverableEn: "Synthesize 100% original, copyright-clean server logic in isolated sandbox.",
      estimatedMinutes: tier === "portfolio" ? 1 : tier === "web_app" ? 4 : 8,
    },
    {
      stepNumber: 4,
      titleEn: "Automated Verification & Security Check",
      deliverableEn: "Automated unit tests, static type checking, and zero-CVE dependency scan.",
      estimatedMinutes: 2,
    },
    {
      stepNumber: 5,
      titleEn: "Repository Packaging & Instant Deploy",
      deliverableEn: "Production-ready repository ZIP bundle with Dockerfile and clean configurations.",
      estimatedMinutes: 1,
    },
  ];
}

/**
 * Modern adapter calculating project quote using Appendix A formula:
 * Platform Price = round(Estimated_Hours * Market_Hourly_Rate * 0.50)
 */
export function calculateDynamicProjectQuote(
  projectId: string,
  tier: ComplexityTier
) {
  const cfg = DEFAULT_PRICING_CONFIG_V1;
  const tierCfg = cfg.tiers[tier];

  // Base feature representations per tier
  const sampleFeatures: FeatureInput[] = [
    {
      id: "f1",
      name: "Core Architecture & UI Structure",
      tier,
      estimatedHours: tier === "portfolio" ? 3 : tier === "web_app" ? 8 : 16,
      selected: true,
    },
    {
      id: "f2",
      name: "Business Logic & Data Contracts",
      tier,
      estimatedHours: tier === "portfolio" ? 2 : tier === "web_app" ? 6 : 14,
      selected: true,
    },
  ];

  const calculation = priceQuote(sampleFeatures, cfg, 0);
  const targetPriceUsd = calculation.totalCents / 100;
  const humanAgencyCostUsd = calculation.lines.reduce((s, l) => s + l.humanCostCents, 0) / 100;

  return {
    projectId,
    complexityTier: tier,
    targetPriceUsd,
    humanAgencyCostUsd,
    savingsPercent: 50,
    cleanPriceLabel: `$${targetPriceUsd.toFixed(2)}`,
    milestones: getReconstructionMilestones(tier),
  };
}
