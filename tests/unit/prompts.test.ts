import { describe, expect, it } from "vitest";
import { getPrompt, PROMPT_VERSION, type PromptRole } from "@/lib/prompts";

const ROLES: PromptRole[] = [
  "analyst",
  "planner",
  "builder",
  "edit_planner",
  "edit_builder",
];

describe("versioned system prompts", () => {
  it("returns a static prompt and version for every required role", () => {
    for (const role of ROLES) {
      const prompt = getPrompt(role);
      expect(prompt.system.length).toBeGreaterThanOrEqual(1500);
      expect(prompt.system).toContain("untrusted");
      expect(prompt.system).toContain("unknown");
      expect(prompt.system).not.toContain("${");
      expect(prompt.version.startsWith(PROMPT_VERSION)).toBe(true);
    }
  });

  it("requires the builder roles to run a build and tests", () => {
    for (const role of ["builder", "edit_builder"] as const) {
      const system = getPrompt(role).system;
      expect(system).toContain("npm run build");
      expect(system).toMatch(/\btests?\b/i);
    }
  });

  it("rejects an unknown role instead of returning a generic prompt", () => {
    expect(() => getPrompt("unknown" as PromptRole)).toThrow(/unknown prompt role/i);
  });
});
