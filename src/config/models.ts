import { env } from "@/env";

export interface BuildModelConfig {
  FAST: string;
  STANDARD: string;
  PREMIUM: string;
}

/**
 * Clean-Room Build Engine Model Configuration
 * Sourced strictly from validated environment settings.
 */
export const BUILD_MODELS: BuildModelConfig = {
  FAST: env.LLM_MODEL_FAST,
  STANDARD: env.LLM_MODEL_STANDARD,
  PREMIUM: env.LLM_MODEL_PREMIUM,
};
