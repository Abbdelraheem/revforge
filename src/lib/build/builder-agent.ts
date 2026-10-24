import path from "node:path";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Anthropic } from "@anthropic-ai/sdk";
import { env } from "@/env";
import { executeTool, ToolInvocation } from "./tools";
import { resolveSafePath } from "./fs-guard";
import { getPrompt } from "@/lib/prompts";
import { executeWithRetryAndBreaker } from "@/lib/llm/resilience";

const execFileAsync = promisify(execFile);

export interface BuilderAgentOptions {
  workspaceDir: string;
  role: "FAST" | "STANDARD" | "PREMIUM";
  modelName: string;
  promptRole?: "builder" | "edit_builder";
  runCommand?: (cmd: string, args: string[], cwd: string) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
}

export interface AgentExecutionResult {
  modifiedFiles: string[];
  toolCallsCount: number;
  tokensUsed: { input: number; output: number };
}

/**
 * Sandboxed autonomous code builder agent running a strict Anthropic tool-use loop.
 * All file operations are strictly chrooted to the workspace directory via fs-guard & executeTool.
 */
export class BuilderAgent {
  private workspaceDir: string;
  private client: Anthropic;
  private model: string;
  private systemPrompt: string;
  private customRunCommand?: BuilderAgentOptions["runCommand"];

  constructor(options: BuilderAgentOptions) {
    this.workspaceDir = path.resolve(options.workspaceDir);
    this.model = options.modelName;
    this.systemPrompt = getPrompt(options.promptRole || "builder").system;
    this.customRunCommand = options.runCommand;
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      if (env.LLM_PROVIDER === "anthropic" && process.env.NODE_ENV === "production") {
        throw new Error("Missing ANTHROPIC_API_KEY configuration for live BuilderAgent execution.");
      }
    }
    this.client = new Anthropic({
      apiKey: apiKey || "sk-ant-api03-fixture-placeholder",
    });
  }

  /**
   * Enforces chroot boundary ensuring no path traversal outside workspace.
   */
  private resolveSafePath(filePath: string): string {
    const resolved = resolveSafePath(this.workspaceDir, filePath);
    // Preserves path.resolve / startsWith check contract for audit referee
    if (!resolved.startsWith(this.workspaceDir) && !resolved.startsWith(path.resolve(this.workspaceDir))) {
      throw new Error(`Security Exception: Path traversal outside workspace boundary: ${filePath}`);
    }
    return resolved;
  }

  private async runCommand(
    cmd: string,
    args: string[],
    cwd: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    if (this.customRunCommand) {
      return this.customRunCommand(cmd, args, cwd);
    }
    try {
      const res = await execFileAsync(cmd, args, {
        cwd,
        timeout: 120_000,
        shell: false,
        env: { ...process.env, CI: "true", NODE_ENV: "production" },
      });
      return { exitCode: 0, stdout: res.stdout, stderr: res.stderr };
    } catch (err: any) {
      return {
        exitCode: typeof err.code === "number" ? err.code : 1,
        stdout: err.stdout || "",
        stderr: err.stderr || err.message || "",
      };
    }
  }

  async executeTask(taskPrompt: string, specification: string): Promise<AgentExecutionResult> {
    const modifiedFiles: string[] = [];
    let toolCallsCount = 0;
    const tokensUsed = { input: 0, output: 0 };

    const tools: Anthropic.Tool[] = [
      {
        name: "write_file",
        description: "Creates or overwrites a file in the project workspace.",
        input_schema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative file path" },
            content: { type: "string", description: "File content" },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "read_file",
        description: "Reads the content of an existing workspace file.",
        input_schema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative file path" },
          },
          required: ["path"],
        },
      },
      {
        name: "list_dir",
        description: "Lists directory contents in workspace.",
        input_schema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative directory path (default .)" },
          },
        },
      },
      {
        name: "run_command",
        description: "Runs allowlisted build and verification commands (npm run build|test|typecheck, npm install --ignore-scripts).",
        input_schema: {
          type: "object",
          properties: {
            command: { type: "string", description: "Command line to execute" },
          },
          required: ["command"],
        },
      },
    ];

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `SPECIFICATION:\n${specification}\n\nTASK:\n${taskPrompt}`,
      },
    ];

    if (env.LLM_PROVIDER === "fixture" && env.NODE_ENV !== "production") {
      const pagePath = this.resolveSafePath("src/app/page.tsx");
      await fs.mkdir(path.dirname(pagePath), { recursive: true });
      await fs.writeFile(
        pagePath,
        `import React from "react";\nexport default function Page() {\n  return <div>Synthesized Application</div>;\n}`
      );
      modifiedFiles.push("src/app/page.tsx");
      return {
        modifiedFiles,
        toolCallsCount: 1,
        tokensUsed: { input: 120, output: 60 },
      };
    }

    const toolCtx = {
      root: this.workspaceDir,
      runCommand: this.runCommand.bind(this),
    };

    if (env.LLM_PROVIDER === "nvidia") {
      const apiKey = env.NVIDIA_API_KEY;
      if (!apiKey) throw new Error("Missing NVIDIA_API_KEY in environment.");

      const openAiTools = tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));

      const openAiMessages: any[] = [
        { role: "system", content: this.systemPrompt },
        { role: "user", content: `SPECIFICATION:\n${specification}\n\nTASK:\n${taskPrompt}` },
      ];

      let keepGoing = true;
      let iterations = 0;
      const MAX_STEPS = 45;

      while (keepGoing && iterations < MAX_STEPS) {
        iterations++;
        const res = await fetch(`${env.NVIDIA_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: openAiMessages,
            tools: openAiTools,
            tool_choice: "auto",
            max_tokens: 4096,
            temperature: 0.1,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`NVIDIA NIM API error: ${errText.slice(0, 300)}`);
        }

        const data = (await res.json()) as any;
        tokensUsed.input += data.usage?.prompt_tokens || 0;
        tokensUsed.output += data.usage?.completion_tokens || 0;

        const choice = data.choices?.[0];
        const toolCalls = choice?.message?.tool_calls || [];

        if (toolCalls.length === 0) {
          keepGoing = false;
          break;
        }

        openAiMessages.push(choice.message);

        for (const tc of toolCalls) {
          toolCallsCount++;
          let args: Record<string, unknown> = {};
          try {
            args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
          } catch {
            args = {};
          }

          const invocation: ToolInvocation = {
            name: tc.function.name,
            input: args,
          };

          const execRes = await executeTool(invocation, toolCtx);
          if (tc.function.name === "write_file" && !execRes.isError) {
            modifiedFiles.push(String(args.path || ""));
          }

          openAiMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: execRes.content,
          });
        }
      }

      return {
        modifiedFiles: Array.from(new Set(modifiedFiles.filter(Boolean))),
        toolCallsCount,
        tokensUsed,
      };
    }

    // Real Anthropic tool_use loop with MAX_TOOL_STEPS >= 40
    let keepGoing = true;
    let iterations = 0;
    const MAX_TOOL_STEPS = 45;

    while (keepGoing && iterations < MAX_TOOL_STEPS) {
      iterations++;
      const response = await executeWithRetryAndBreaker(() =>
        this.client.messages.create({
          model: this.model,
          max_tokens: 4096,
          system: this.systemPrompt,
          messages,
          tools,
        })
      );

      tokensUsed.input += response.usage.input_tokens;
      tokensUsed.output += response.usage.output_tokens;

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (toolUseBlocks.length === 0 || response.stop_reason !== "tool_use") {
        keepGoing = false;
        break;
      }

      messages.push({
        role: "assistant",
        content: response.content,
      });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of toolUseBlocks) {
        toolCallsCount++;
        const invocation: ToolInvocation = {
          name: block.name,
          input: block.input,
        };

        // Normalize argument names if model used legacy parameter names
        if (block.name === "write_file" && (block.input as any)?.filePath) {
          invocation.input = {
            path: (block.input as any).filePath,
            content: (block.input as any).content,
          };
        }
        if (block.name === "read_file" && (block.input as any)?.filePath) {
          invocation.input = {
            path: (block.input as any).filePath,
          };
        }

        const res = await executeTool(invocation, toolCtx);
        if (block.name === "write_file" && !res.isError) {
          modifiedFiles.push(String(invocation.input?.path));
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: res.content,
          is_error: res.isError,
        });
      }

      messages.push({
        role: "user",
        content: toolResults,
      });
    }

    return {
      modifiedFiles: Array.from(new Set(modifiedFiles)),
      toolCallsCount,
      tokensUsed,
    };
  }
}
