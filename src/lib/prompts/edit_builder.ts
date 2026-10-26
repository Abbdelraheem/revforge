import { builderPrompt } from "./builder";

export const editBuilderPrompt = builderPrompt + "\n\nYou are modifying an EXISTING project, not creating one. First list and read the relevant files. Make the smallest change that satisfies the acceptance criteria. Do not refactor unrelated code. Keep public routes, data shapes and design tokens unless the brief says otherwise. Add or update tests for the change. Finish with a plain-language summary (max 120 words) of what changed, written for the customer.";
