import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);

export class SandboxSecurityError extends Error {
  constructor(message: string) {
    super(`[SANDBOX_SECURITY_VIOLATION] ${message}`);
    this.name = "SandboxSecurityError";
  }
}

// Strict allowlist of permissible binary tools executable on host / container daemon
const ALLOWED_EXECUTABLES = new Set([
  "docker",
  "podman",
  "rea-agents-mcp",
  "file",
  "strings",
  "readelf",
]);

// Zod Schema for Structured MCP JSON-RPC protocol
export const McpRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.enum([
    "tools/list",
    "tools/call",
    "analysis/ghidra_decompile",
    "analysis/jadx_decompile",
    "analysis/asar_extract",
    "synthesis/clean_room_generate",
    "verification/run_tests",
  ]),
  params: z.record(z.unknown()).optional(),
});

export const McpRpcResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
      data: z.unknown().optional(),
    })
    .optional(),
});

export type McpRpcRequest = z.infer<typeof McpRpcRequestSchema>;
export type McpRpcResponse = z.infer<typeof McpRpcResponseSchema>;

export interface SandboxExecutionOptions {
  artifactUuid: string;
  timeoutMs?: number;
  memoryLimit?: string;
  cpuQuota?: string;
  enableNetwork?: boolean;
}

/**
 * Executes a command with ZERO SHELL INJECTION RISK.
 * Strictly uses execFile with shell: false and array arguments.
 */
export async function runSecureExecFile(
  executable: string,
  args: string[],
  options: { timeout?: number; cwd?: string; maxBuffer?: number } = {}
): Promise<{ stdout: string; stderr: string }> {
  // Validate executable against strict allowlist
  if (!ALLOWED_EXECUTABLES.has(executable)) {
    throw new SandboxSecurityError(`Executable '${executable}' is not in the zero-trust allowlist.`);
  }

  // Validate all arguments: ensure no newline or null-byte characters
  for (const arg of args) {
    if (/[\x00\r\n]/.test(arg)) {
      throw new SandboxSecurityError("Command argument contains illegal null or newline characters.");
    }
  }

  try {
    const result = await execFileAsync(executable, args, {
      shell: false, // MANDATORY: NEVER USE SHELL
      timeout: options.timeout || 360_000, // 360s default for Ghidra cold starts
      maxBuffer: options.maxBuffer || 50 * 1024 * 1024,
      cwd: options.cwd,
      env: {
        // Strip parent environment variables to avoid leaking secrets
        NODE_ENV: "production",
        PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
      },
    });

    return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
  } catch (error: any) {
    throw new SandboxSecurityError(
      `Secure execution failed: ${error.message} (Exit Code: ${error.code || "unknown"})`
    );
  }
}

/**
 * Spawns an isolated gVisor / Docker container with non-root user,
 * read-only root filesystem, network isolation (--network=none), and strict quotas.
 */
export async function runIsolatedSandboxContainer(
  containerImage: string,
  commandArgs: string[],
  options: SandboxExecutionOptions
): Promise<{ stdout: string; stderr: string }> {
  // UUIDv4 validation for artifact reference
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(options.artifactUuid)) {
    throw new SandboxSecurityError("Invalid artifact UUID passed to sandbox runner.");
  }

  const dockerArgs: string[] = [
    "run",
    "--rm",
    // gVisor user-space kernel runtime isolation
    "--runtime=runsc",
    // Drop all capabilities
    "--cap-drop=ALL",
    // Security options: disallow privilege escalation
    "--security-opt=no-new-privileges",
    // Non-root sandbox user
    "--user=10001:10001",
    // Read-only root filesystem
    "--read-only",
    // Isolated tmpfs for scratch space
    "--tmpfs=/tmp:rw,noexec,nosuid,size=1g",
    // Strict resource limits
    `--memory=${options.memoryLimit || "4g"}`,
    `--cpus=${options.cpuQuota || "2.0"}`,
    // Network isolation: binaries analyzed with no internet access
    options.enableNetwork ? "--network=bridge" : "--network=none",
    // Artifact volume mounted read-only
    "-v",
    `/var/revforge/vault/${options.artifactUuid}:/vault/target:ro`,
    containerImage,
    ...commandArgs,
  ];

  return runSecureExecFile("docker", dockerArgs, {
    timeout: options.timeoutMs || 360_000,
  });
}
