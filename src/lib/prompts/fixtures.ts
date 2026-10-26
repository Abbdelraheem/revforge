import type { PromptRole } from "./index";

export interface PromptEvalFixture {
  id: string;
  role: PromptRole;
  task: string;
  required: string[];
  forbidden?: string[];
}

/**
 * Offline prompt fixtures. They do not call a model: they assert that the
 * static prompt for each role still carries the contract, trust boundary, and
 * verification language the role depends on. `prompts:live` is the opt-in
 * model-backed check and is never part of CI.
 */
export const PROMPT_EVAL_FIXTURES: PromptEvalFixture[] = [
  {
    id: "analyst-unknown-boundary",
    role: "analyst",
    task: "Analyse a target whose server-side stack cannot be observed.",
    required: [
      "evidence",
      "unknown_server_side",
      "confidence",
      "clean-room",
      "untrusted",
      "unknown",
    ],
    forbidden: ["ignore previous instructions"],
  },
  {
    id: "planner-testable-obligations",
    role: "planner",
    task: "Turn a report into an ordered, testable build plan.",
    required: [
      "obligations",
      "acceptance",
      "dependencies",
      "test plan",
      "untrusted",
      "unknown",
    ],
    forbidden: ["ignore previous instructions"],
  },
  {
    id: "builder-real-verification",
    role: "builder",
    task: "Implement an obligation and prove it builds and tests.",
    required: [
      "untrusted",
      "unknown",
      "npm run build",
      "tests",
      "typecheck",
      "do not delete",
    ],
    forbidden: ["delete the database"],
  },
  {
    id: "edit-planner-minimal-brief",
    role: "edit_planner",
    task: "Translate a non-English edit request into a minimal brief.",
    required: [
      "untrusted",
      "unknown",
      "English",
      "acceptanceCriteria",
      "clarification",
      "targetFiles",
    ],
    forbidden: ["output source code"],
  },
  {
    id: "edit-builder-minimal-diff",
    role: "edit_builder",
    task: "Apply an approved Studio brief without rewriting the project.",
    required: [
      "untrusted",
      "unknown",
      "smallest change",
      "npm run build",
      "tests",
    ],
    forbidden: ["delete all tests"],
  },
  {
    id: "reviewer-quality-audit",
    role: "reviewer",
    task: "Audit a built workspace against the clean-room specification.",
    required: [
      "verdict",
      "untrusted",
      "unknown",
      "coverage",
      "quality",
      "safety",
    ],
    forbidden: ["ignore previous instructions"],
  },
];
