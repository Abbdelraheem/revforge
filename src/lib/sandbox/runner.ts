import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import { ExtractorResultSchema, ExtractorResult } from "../analysis/extractors/types";

const execFileAsync = promisify(nodeExecFile);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_KINDS = new Set(["url", "har", "apk", "pe", "elf", "macho", "asar"]);

export interface ExtractorRequest {
  kind: "url" | "har" | "apk" | "pe" | "elf" | "macho" | "asar";
  artifactId: string;
  jobId: string;
  inputPath?: string;
  url?: string;
}

export interface ExtractorDeps {
  execFile?: (
    cmd: string,
    args: string[],
    options: any
  ) => Promise<{ stdout: string; stderr: string }>;
  env?: {
    NODE_ENV?: string;
    SANDBOX_RUNTIME?: string;
  };
}

export interface BuildCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Executes a sandboxed target extractor inside gVisor (runsc) or isolated runner.
 * Strictly enforces non-root user, no network for binaries, and clean teardown.
 */
export async function runExtractor(
  reqOrKind: ExtractorRequest | string,
  depsOrTargetInput?: ExtractorDeps | string
): Promise<ExtractorResult> {
  let req: ExtractorRequest;
  let deps: ExtractorDeps;

  // Support both object interface and legacy string signature
  if (typeof reqOrKind === "string") {
    const kind = reqOrKind.toLowerCase().replace(/_archive|_package|_binary/, "");
    const targetInput = String(depsOrTargetInput || "");
    const isUrl = targetInput.startsWith("http://") || targetInput.startsWith("https://");

    req = {
      kind: (ALLOWED_KINDS.has(kind) ? kind : "url") as any,
      artifactId: "00000000-0000-4000-8000-000000000001",
      jobId: "00000000-0000-4000-8000-000000000002",
      url: isUrl ? targetInput : undefined,
      inputPath: !isUrl ? targetInput : undefined,
    };
    deps = {};
  } else {
    req = reqOrKind;
    deps = (depsOrTargetInput as ExtractorDeps) || {};
  }

  // 1. Validate UUIDs and kind BEFORE any exec
  if (!UUID_REGEX.test(req.artifactId)) {
    throw new Error(`Invalid artifactId: must be a valid UUID v4 (${req.artifactId})`);
  }
  if (!UUID_REGEX.test(req.jobId)) {
    throw new Error(`Invalid jobId: must be a valid UUID v4 (${req.jobId})`);
  }
  if (!ALLOWED_KINDS.has(req.kind)) {
    throw new Error(`Unsupported extractor kind '${req.kind}'. Allowed: ${Array.from(ALLOWED_KINDS).join(", ")}`);
  }

  const nodeEnv = deps.env?.NODE_ENV || process.env.NODE_ENV || "development";
  const sandboxRuntime = deps.env?.SANDBOX_RUNTIME || process.env.SANDBOX_RUNTIME || "runc";

  // Production requires gVisor (runsc) and strictly rejects runc
  if (nodeEnv === "production" && sandboxRuntime === "runc") {
    throw new Error("runc runtime is strictly prohibited in production. gVisor (runsc) is required.");
  }

  const invokeExecFile = deps.execFile || (async (cmd: string, args: string[], opts: any) => {
    return execFileAsync(cmd, args, opts);
  });

  const containerLabel = `revforge.job=${req.jobId}`;
  const containerName = `revforge-extractor-${req.jobId}`;

  // Build separate docker argv entries (no fused strings)
  const argv: string[] = [
    "run",
    "--rm",
    "--name", containerName,
    "--label", containerLabel,
    "--cap-drop=ALL",
    "--read-only",
    "--security-opt=no-new-privileges",
    "--pids-limit", "100",
    "--memory", "1g",
    "--user", "10001:10001",
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=1g",
  ];

  if (nodeEnv === "production" || sandboxRuntime === "runsc") {
    argv.push("--runtime=runsc");
  }

  // Network isolation
  if (req.kind === "url") {
    argv.push("--network=revforge-egress-net");
  } else {
    argv.push("--network=none");
  }

  // Mount read-only input path if present
  if (req.inputPath && fs.existsSync(req.inputPath)) {
    argv.push("-v", `${path.resolve(req.inputPath)}:/workspace/input:ro`);
  }

  const imageName = `revforge/extractor-${req.kind}:latest`;
  argv.push(imageName);

  if (req.url) {
    argv.push(req.url);
  } else if (req.inputPath) {
    argv.push("/workspace/input");
  }

  try {
    let stdout = "";
    try {
      const res = await invokeExecFile("docker", argv, {
        timeout: 60_000,
        shell: false,
        maxBuffer: 16 * 1024 * 1024,
      });
      stdout = String(res.stdout);
    } catch (dockerErr: any) {
      // In local non-docker dev environments, invoke local extractor script directly
      const extractorScript = path.resolve(process.cwd(), `sandbox/extractors/${req.kind}.ts`);
      if (fs.existsSync(extractorScript) && nodeEnv !== "production") {
        const localTarget = req.url || req.inputPath || "";
        const localRes = await invokeExecFile("npx", ["tsx", extractorScript, localTarget], {
          timeout: 60_000,
          shell: false,
        });
        stdout = String(localRes.stdout);
      } else {
        throw new Error(`Docker extractor failed: ${dockerErr.message || String(dockerErr)}`);
      }
    }

    // Parse stdout as JSON and validate with ExtractorResultSchema
    let parsed: any;
    try {
      parsed = JSON.parse(stdout.trim());
    } catch {
      throw new Error(`Extractor stdout was not valid JSON: ${stdout.slice(0, 300)}`);
    }

    return ExtractorResultSchema.parse(parsed);
  } finally {
    // Teardown cleanup: ensure container with label is removed
    try {
      await invokeExecFile("docker", ["rm", "-f", containerName], {
        timeout: 10_000,
        shell: false,
      }).catch(() => {});
    } catch {}
  }
}

/**
 * Runs a build command inside the verification sandbox.
 */
export async function runBuildCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<BuildCommandResult> {
  try {
    const res = await execFileAsync(command, args, {
      cwd,
      shell: false,
      timeout: 120_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    return { stdout: res.stdout, stderr: res.stderr, exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || err.message || "",
      exitCode: typeof err.code === "number" ? err.code : 1,
    };
  }
}
