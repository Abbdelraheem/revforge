import fs from "node:fs";
import path from "node:path";
import { resolveSafePath } from "./fs-guard";

export interface ToolContext {
  root: string;
  runCommand(
    cmd: string,
    args: string[],
    cwd: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string }>;
  specSearch?(query: string): Promise<string[]>;
}

export interface ToolInvocation {
  name: string;
  input: any;
}

export interface ToolResult {
  content: string;
  isError: boolean;
}

const ALLOWED_NPX_TOOLS = new Set(["tsc", "eslint", "vitest", "prettier"]);
const REJECTED_BINARIES = new Set([
  "sh",
  "bash",
  "curl",
  "wget",
  "rm",
  "git",
  "docker",
  "python",
  "python3",
  "cat",
]);

/**
 * Validates and executes agent tool calls inside the workspace boundary.
 */
export async function executeTool(
  tool: ToolInvocation,
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    switch (tool.name) {
      case "read_file": {
        const filePath = resolveSafePath(ctx.root, tool.input?.path, {
          forWrite: false,
        });
        if (!fs.existsSync(filePath)) {
          return { content: `File not found: ${tool.input?.path}`, isError: true };
        }
        const content = fs.readFileSync(filePath, "utf-8");
        return { content, isError: false };
      }

      case "write_file": {
        const filePath = resolveSafePath(ctx.root, tool.input?.path, {
          forWrite: true,
        });
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, String(tool.input?.content ?? ""), "utf-8");
        return { content: `Successfully wrote ${tool.input?.path}`, isError: false };
      }

      case "list_dir": {
        const dirPath = resolveSafePath(ctx.root, tool.input?.path || ".", {
          forWrite: false,
        });
        if (!fs.existsSync(dirPath)) {
          return { content: `Directory not found: ${tool.input?.path}`, isError: true };
        }
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        const list = entries.map(
          (e) => `${e.isDirectory() ? "[dir] " : "[file]"} ${e.name}`
        );
        return { content: list.join("\n"), isError: false };
      }

      case "run_command": {
        const rawCmd = String(tool.input?.command || "").trim();
        if (!rawCmd) {
          return { content: "Empty command string", isError: true };
        }

        // Reject shell metacharacters
        if (/[;&|`$><\n\r]/.test(rawCmd)) {
          return {
            content: "Shell metacharacters (;, &, |, `, $, >, <, newline) are strictly forbidden",
            isError: true,
          };
        }

        const tokens = rawCmd.split(/\s+/).filter(Boolean);
        const [bin, ...args] = tokens;
        if (!bin) {
          return { content: "No binary specified in command", isError: true };
        }

        if (REJECTED_BINARIES.has(bin.toLowerCase())) {
          return {
            content: `Execution of binary '${bin}' is rejected by safety policy`,
            isError: true,
          };
        }

        // Validate command allowlist
        if (bin === "npm") {
          const sub = args[0];
          if (sub === "run") {
            const script = args[1];
            const allowedScripts = ["build", "test", "lint", "typecheck"];
            if (!script || !allowedScripts.includes(script)) {
              return {
                content: `npm run only supports [${allowedScripts.join(", ")}], received '${script}'`,
                isError: true,
              };
            }
          } else if (sub === "install" || sub === "ci") {
            // Always append --ignore-scripts
            if (!args.includes("--ignore-scripts")) {
              args.push("--ignore-scripts");
            }
          } else {
            return {
              content: `npm subcommand '${sub}' is prohibited (only run, install, ci permitted)`,
              isError: true,
            };
          }
        } else if (bin === "npx") {
          const toolName = args[0]?.toLowerCase();
          if (!toolName || !ALLOWED_NPX_TOOLS.has(toolName)) {
            return {
              content: `npx tool '${toolName}' is prohibited (only [${Array.from(ALLOWED_NPX_TOOLS).join(", ")}] allowed)`,
              isError: true,
            };
          }
        } else if (bin === "node") {
          // Reject node -e
          if (args.includes("-e") || args.includes("--eval")) {
            return {
              content: "node --eval is strictly prohibited",
              isError: true,
            };
          }
          // Validate node script is within root
          const scriptFile = args.find((a) => !a.startsWith("-"));
          if (scriptFile) {
            try {
              resolveSafePath(ctx.root, scriptFile, { forWrite: false });
            } catch (err: any) {
              return {
                content: `Node script must reside inside workspace: ${err.message}`,
                isError: true,
              };
            }
          }
        } else {
          return {
            content: `Command '${bin}' is not in the execution allowlist`,
            isError: true,
          };
        }

        const res = await ctx.runCommand(bin, args, ctx.root);
        const combined = [res.stdout, res.stderr].filter(Boolean).join("\n");
        return {
          content: combined || `Process exited with code ${res.exitCode}`,
          isError: res.exitCode !== 0,
        };
      }

      case "search_spec": {
        if (!ctx.specSearch) {
          return { content: "Spec search capability not configured", isError: true };
        }
        const results = await ctx.specSearch(String(tool.input?.query || ""));
        return {
          content: results.join("\n---\n") || "No matching spec entries found.",
          isError: false,
        };
      }

      default:
        return { content: `Unknown tool: ${tool.name}`, isError: true };
    }
  } catch (err: any) {
    return { content: `Tool error: ${err?.message || String(err)}`, isError: true };
  }
}
