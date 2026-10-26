import { env } from "@/env";

export interface BuildModelConfig {
  FAST: string;
  STANDARD: string;
  PREMIUM: string;
}

export type ModelProfile = "test" | "launch";

export const PROFILE_MODELS: Record<ModelProfile, BuildModelConfig> = {
  launch: {
    FAST: "claude-haiku-5-5",
    STANDARD: "claude-opus-5-5",
    PREMIUM: "claude-opus-5-5",
  },
  test: {
    FAST: "minimaxai/minimax-m3.1-flash",
    STANDARD: "minimaxai/minimax-m3.1-flash",
    PREMIUM: "nvidia/nemotron-3-ultra-550b-a55b",
  },
};

/**
 * Clean-Room Build Engine Model Configuration.
 *
 * When MODEL_PROFILE is 'launch', Opus 5.5 is routed for builder/planner/reviewer.
 * When MODEL_PROFILE is 'test', the cheap provider is routed for experimentation.
 * Explicit MODEL_* environment variables override defaults.
 */
const defaultForProfile = PROFILE_MODELS[env.MODEL_PROFILE as ModelProfile] || PROFILE_MODELS.launch;

export const BUILD_MODELS: BuildModelConfig = {
  FAST:
    env.MODEL_FAST ??
    env.LLM_MODEL_FAST ??
    defaultForProfile.FAST,
  STANDARD:
    env.MODEL_STANDARD ??
    env.LLM_MODEL_STANDARD ??
    defaultForProfile.STANDARD,
  PREMIUM:
    env.MODEL_PREMIUM ??
    env.LLM_MODEL_PREMIUM ??
    defaultForProfile.PREMIUM,
};

export function getActiveModelProfile(): ModelProfile {
  return (env.MODEL_PROFILE as ModelProfile) || "test";
}

export type ModelTier = keyof BuildModelConfig;

/**
 * A single routing table for every model call in the product. Quality-bearing
 * work defaults to the Opus 5.5 tier; FAST is reserved for work where a weaker
 * model cannot change the shipped artifact (titles, labels, summaries).
 */
export const MODEL_ROUTES = {
  analyst: "STANDARD",
  planner: "PREMIUM",
  builder: "STANDARD",
  verifier: "FAST",
  reviewer: "PREMIUM",
  studio_enhance: "FAST",
  studio_edit: "PREMIUM",
  studio_summary: "FAST",
} as const satisfies Record<string, ModelTier>;

export type ModelRoute = keyof typeof MODEL_ROUTES;

export function getModelTierFor(route: ModelRoute): ModelTier {
  return MODEL_ROUTES[route];
}

export function getModelFor(route: ModelRoute): string {
  return BUILD_MODELS[MODEL_ROUTES[route]];
}

export function allConfiguredModelIds(): string[] {
  return Array.from(new Set(Object.values(BUILD_MODELS)));
}
