import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { getPrompt, type PromptRole } from "../src/lib/prompts";

const ROLES: PromptRole[] = [
  "analyst",
  "planner",
  "builder",
  "edit_planner",
  "edit_builder",
];

async function main() {
  if (process.env.CI) {
    throw new Error(
      "prompts:live is an opt-in model-backed check and must not run in CI. Use prompts:eval instead."
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "prompts:live requires ANTHROPIC_API_KEY. It is intentionally not run by CI or by prompts:eval."
    );
  }

  const model = process.env.LLM_MODEL_FAST;
  if (!model) {
    throw new Error("prompts:live requires LLM_MODEL_FAST so the call uses a configured model.");
  }

  const client = new Anthropic({ apiKey });
  let failed = false;

  for (const role of ROLES) {
    const prompt = getPrompt(role);
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 16,
        system: prompt.system,
        messages: [
          {
            role: "user",
            content:
              "This is a prompt contract smoke test. Reply with exactly OK and nothing else.",
          },
        ],
      });
      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => (block as { type: "text"; text: string }).text)
        .join(" ")
        .trim();
      if (!/^OK\b/i.test(text)) {
        failed = true;
        console.error(`FAIL ${role} (${prompt.version}): unexpected reply ${JSON.stringify(text)}`);
      } else {
        console.log(`PASS ${role} (${prompt.version})`);
      }
    } catch (error) {
      failed = true;
      console.error(
        `FAIL ${role} (${prompt.version}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
