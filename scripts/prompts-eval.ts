import "dotenv/config";
import {
  getPrompt,
  PROMPT_VERSION,
  type PromptRole,
} from "../src/lib/prompts";
import { PROMPT_EVAL_FIXTURES } from "../src/lib/prompts/fixtures";

const ROLES: PromptRole[] = [
  "analyst",
  "planner",
  "builder",
  "edit_planner",
  "edit_builder",
];

const failures: string[] = [];

function check(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

console.log(`Prompt eval ${PROMPT_VERSION}`);

for (const role of ROLES) {
  const prompt = getPrompt(role);
  const system = prompt.system;
  check(system.length >= 1500, `${role}: system prompt is under 1500 characters`);
  check(system.includes("untrusted"), `${role}: missing lowercase "untrusted"`);
  check(system.includes("unknown"), `${role}: missing lowercase "unknown"`);
  check(!system.includes("${"), `${role}: contains a template placeholder`);
  check(
    prompt.version.startsWith(PROMPT_VERSION),
    `${role}: version is not tied to PROMPT_VERSION`
  );

  if (role === "builder" || role === "edit_builder") {
    check(system.includes("npm run build"), `${role}: does not require npm run build`);
    check(/\btests?\b/i.test(system), `${role}: does not require tests`);
  }
  if (role === "edit_planner") {
    check(system.includes("acceptanceCriteria"), `${role}: missing acceptanceCriteria`);
    check(system.includes("clarification"), `${role}: missing clarification contract`);
  }
  if (role === "analyst") {
    check(system.includes("evidence"), `${role}: missing evidence ledger contract`);
    check(system.includes("unknown_server_side"), `${role}: missing unknown_server_side`);
  }
}

for (const fixture of PROMPT_EVAL_FIXTURES) {
  const system = getPrompt(fixture.role).system.toLowerCase();
  for (const term of fixture.required) {
    check(system.includes(term.toLowerCase()), `${fixture.id}: missing "${term}"`);
  }
  for (const term of fixture.forbidden || []) {
    check(
      !system.includes(term.toLowerCase()),
      `${fixture.id}: contains forbidden "${term}"`
    );
  }
  console.log(`  [${fixture.role}] ${fixture.id}`);
}

if (PROMPT_EVAL_FIXTURES.length !== 5) {
  failures.push(`expected 5 fixtures, found ${PROMPT_EVAL_FIXTURES.length}`);
}

if (failures.length > 0) {
  console.error("\nPrompt eval failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`\n${ROLES.length} roles and ${PROMPT_EVAL_FIXTURES.length} fixtures passed.`);
