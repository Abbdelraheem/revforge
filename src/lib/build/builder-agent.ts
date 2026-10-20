import path from "node:path";
import fs from "node:fs/promises";
import { Anthropic } from "@anthropic-ai/sdk";
import { env } from "@/env";

export interface BuilderAgentOptions {
  workspaceDir: string;
  role: "FAST" | "STANDARD" | "PREMIUM";
  modelName: string;
}

export interface AgentExecutionResult {
  modifiedFiles: string[];
  toolCallsCount: number;
  tokensUsed: { input: number; output: number };
}

/**
 * Sandboxed autonomous code builder agent running a strict Anthropic tool-use loop.
 * All file operations are strictly chrooted to the workspace directory.
 */
export class BuilderAgent {
  private workspaceDir: string;
  private client: Anthropic;
  private model: string;

  constructor(options: BuilderAgentOptions) {
    this.workspaceDir = path.resolve(options.workspaceDir);
    this.model = options.modelName;
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY || "mock-key",
    });
  }

  /**
   * Enforces chroot boundary ensuring no path traversal outside workspace.
   */
  private resolveSafePath(filePath: string): string {
    const resolved = path.resolve(this.workspaceDir, filePath);
    if (!resolved.startsWith(this.workspaceDir)) {
      throw new Error(`Security Exception: Path traversal outside workspace boundary: ${filePath}`);
    }
    return resolved;
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
            filePath: { type: "string" },
            content: { type: "string" },
          },
          required: ["filePath", "content"],
        },
      },
      {
        name: "read_file",
        description: "Reads the content of an existing workspace file.",
        input_schema: {
          type: "object",
          properties: {
            filePath: { type: "string" },
          },
          required: ["filePath"],
        },
      },
      {
        name: "list_dir",
        description: "Lists directory contents in workspace.",
        input_schema: {
          type: "object",
          properties: {
            dirPath: { type: "string" },
          },
        },
      },
    ];

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `SPECIFICATION:\n${specification}\n\nTASK:\n${taskPrompt}`,
      },
    ];

    if (env.LLM_PROVIDER === "fixture" || !env.ANTHROPIC_API_KEY) {
      // Local fixture execution path: write basic app scaffold
      const pagePath = this.resolveSafePath("src/app/page.tsx");
      await fs.mkdir(path.dirname(pagePath), { recursive: true });
      await fs.writeFile(
        pagePath,
        `import React from "react";\nexport default function Page() {\n  return <div>Clean-room built application.</div>;\n}`
      );
      modifiedFiles.push("src/app/page.tsx");
      return {
        modifiedFiles,
        toolCallsCount: 1,
        tokensUsed: { input: 120, output: 60 },
      };
    }

    // Real Anthropic tool_use loop
    let keepGoing = true;
    let iterations = 0;
    const MAX_TOOL_STEPS = 8;

    while (keepGoing && iterations < MAX_TOOL_STEPS) {
      iterations++;
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: "You are an expert software engineer reconstructing an application cleanly from specifications. Use provided tools to build the workspace.",
        messages,
        tools,
      });

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
        const { name, input } = block;

        try {
          if (name === "write_file") {
            const { filePath, content } = input as { filePath: string; content: string };
            const safe = this.resolveSafePath(filePath);
            await fs.mkdir(path.dirname(safe), { recursive: true });
            await fs.writeFile(safe, content, "utf-8");
            modifiedFiles.push(filePath);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: `Successfully wrote ${filePath}`,
            });
          } else if (name === "read_file") {
            const { filePath } = input as { filePath: string };
            const safe = this.resolveSafePath(filePath);
            const content = await fs.readFile(safe, "utf-8");
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content,
            });
          } else if (name === "list_dir") {
            const { dirPath } = (input as { dirPath?: string }) || {};
            const safe = this.resolveSafePath(dirPath || ".");
            const items = await fs.readdir(safe);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(items),
            });
          }
        } catch (toolErr: any) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            is_error: true,
            content: `Tool error: ${toolErr.message}`,
          });
        }
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
