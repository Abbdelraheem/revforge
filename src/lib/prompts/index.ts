import { analystPrompt } from "./analyst";
import { plannerPrompt } from "./planner";
import { builderPrompt } from "./builder";
import { editPlannerPrompt } from "./edit_planner";
import { editBuilderPrompt } from "./edit_builder";
import { reviewerPrompt } from "./reviewer";

export type PromptRole =
  | "analyst"
  | "planner"
  | "builder"
  | "edit_planner"
  | "edit_builder"
  | "reviewer";

export interface Prompt {
  system: string;
  version: string;
}

/**
 * One version covers the whole static prompt set. The database stores this
 * value with each report, build job, and Studio edit so a result can always be
 * traced to the exact prompt text that produced it.
 */
export const PROMPT_VERSION = "v10";

const PROMPTS: Record<PromptRole, string> = {
  analyst: analystPrompt,
  planner: plannerPrompt,
  builder: builderPrompt,
  edit_planner: editPlannerPrompt,
  edit_builder: editBuilderPrompt,
  reviewer: reviewerPrompt,
};

export function getPrompt(role: PromptRole): Prompt {
  const system = PROMPTS[role];
  if (!system) {
    throw new Error("Unknown prompt role: " + String(role));
  }
  return {
    system,
    version: PROMPT_VERSION + "." + role,
  };
}
