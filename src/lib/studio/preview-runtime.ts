import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(nodeExecFile);

const defaultExecFile = async (
  cmd: string,
  args: string[],
  options: Record<string, unknown>
): Promise<{ stdout: string; stderr: string }> => {
  const result = await execFileAsync(cmd, args, options as never);
  return {
    stdout: String(result.stdout ?? ""),
    stderr: String(result.stderr ?? ""),
  };
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PREVIEW_IMAGE = "revforge/preview-runtime:latest";
export const PREVIEW_NETWORK = "revforge-preview";
export const PREVIEW_IDLE_TTL_MS = 10 * 60 * 1000;
export const PREVIEW_HARD_TTL_MS = 60 * 60 * 1000;
export const PREVIEW_DEFAULT_PORT = 4100;

export type PreviewState =
  | "requested"
  | "building"
  | "starting"
  | "ready"
  | "stopping"
  | "stopped"
  | "error";

export type PreviewEvent =
  | string
  | {
      type?: string;
      event?: string;
      name?: string;
      state?: PreviewState;
      error?: string;
    };

export interface PreviewEnv {
  NODE_ENV?: string;
  SANDBOX_RUNTIME?: string;
}

export interface BuildPreviewArgvInput {
  sessionId: string;
  workspaceDir: string;
  port: number;
  env?: PreviewEnv;
}

export interface PreviewRuntimeDeps {
  execFile?: (
    cmd: string,
    args: string[],
    options: Record<string, unknown>
  ) => Promise<{ stdout: string; stderr: string }>;
  env?: PreviewEnv;
  port?: number;
  build?: boolean;
  now?: () => number;
}

export interface StartedPreview {
  sessionId: string;
  containerId: string;
  internalPort: number;
  staticExport: boolean;
  startedAt: string;
}

const EVENT_ALIASES: Record<string, string> = {
  build: "build_started",
  building: "build_started",
  build_start: "build_started",
  buildstarted: "build_started",
  built: "build_succeeded",
  build_ok: "build_succeeded",
  build_success: "build_succeeded",
  build_complete: "build_succeeded",
  build_failed: "build_failed",
  build_error: "build_failed",
  start: "start_succeeded",
  started: "start_succeeded",
  running: "start_succeeded",
  ready: "start_succeeded",
  start_ok: "start_succeeded",
  start_success: "start_succeeded",
  start_failed: "start_failed",
  start_error: "start_failed",
  stop: "stop_requested",
  stopping: "stop_requested",
  stop_requested: "stop_requested",
  stopped: "stopped",
  stop_succeeded: "stopped",
  stop_complete: "stopped",
  failed: "error",
  failure: "error",
  crash: "error",
  timeout: "error",
  expired: "error",
  retry: "retry",
  restart: "retry",
  request: "retry",
  requested: "retry",
  queued: "retry",
};

function normalizeEvent(event: PreviewEvent): string {
  const raw =
    typeof event === "string"
      ? event
      : event?.type || event?.event || event?.name || "heartbeat";

  const normalized = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/^preview_/, "");

  return EVENT_ALIASES[normalized] || normalized;
}

/**
 * Single pure transition function for preview sessions. Invalid or unknown
 * events are heartbeats: they never invent a state change.
 */
export function nextPreviewState(
  state: PreviewState,
  event: PreviewEvent
): PreviewState {
  const type = normalizeEvent(event);

  if (type === "heartbeat" || type === "tick" || type === "ping") {
    return state;
  }

  if (type === "retry") {
    return state === "error" || state === "stopped" || state === "requested"
      ? "requested"
      : state;
  }

  if (type === "build_started") {
    return state === "requested" || state === "error" || state === "stopped"
      ? "building"
      : state;
  }

  if (type === "build_succeeded") {
    return state === "building" ? "starting" : state;
  }

  if (type === "build_failed") {
    return state === "building" ? "error" : state;
  }

  if (type === "start_succeeded") {
    return state === "starting" || state === "building" ? "ready" : state;
  }

  if (type === "start_failed") {
    return state === "starting" || state === "building" ? "error" : state;
  }

  if (type === "stop_requested") {
    return state === "stopped" || state === "stopping" ? state : "stopping";
  }

  if (type === "stopped") {
    return state === "stopped"
      ? state
      : state === "stopping" || state === "ready" || state === "error"
        ? "stopped"
        : state;
  }

  if (type === "error") {
    return state === "stopped" ? state : "error";
  }

  return state;
}

export function isPreviewState(value: unknown): value is PreviewState {
  return (
    value === "requested" ||
    value === "building" ||
    value === "starting" ||
    value === "ready" ||
    value === "stopping" ||
    value === "stopped" ||
    value === "error"
  );
}

function validateUuid(value: string, label: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new Error(`${label} must be a valid UUID (${String(value)}).`);
  }
}

function resolveRuntime(env: PreviewEnv): string {
  const nodeEnv = env.NODE_ENV || process.env.NODE_ENV || "development";
  const runtime = env.SANDBOX_RUNTIME || process.env.SANDBOX_RUNTIME || "runc";

  if (nodeEnv === "production" && runtime === "runc") {
    throw new Error(
      "runc runtime is strictly prohibited for preview in production. gVisor (runsc) is required."
    );
  }

  return nodeEnv === "production" ? "runsc" : runtime;
}

/**
 * Builds the hardened `docker run` argv for one preview container. Every CLI
 * flag is a separate array entry; no shell is involved. The workspace is
 * mounted read-only, the container has no route to the public internet, and
 * the only writable locations are tmpfs mounts.
 */
export function buildPreviewArgv({
  sessionId,
  workspaceDir,
  port,
  env = {},
}: BuildPreviewArgvInput): string[] {
  validateUuid(sessionId, "sessionId");

  if (!workspaceDir || typeof workspaceDir !== "string" || workspaceDir.includes("\0")) {
    throw new Error("workspaceDir must be a non-empty path.");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("port must be an integer between 1 and 65535.");
  }

  const runtime = resolveRuntime(env);
  const resolvedWorkspace = path.resolve(workspaceDir);
  const nodeEnv = env.NODE_ENV || process.env.NODE_ENV || "development";
  const containerName = `revforge-preview-${sessionId}`;

  const argv: string[] = [
    "run",
    "--rm",
    "--detach",
    "--name",
    containerName,
    "--label",
    `revforge.preview=${sessionId}`,
    "--cap-drop=ALL",
    "--read-only",
    "--security-opt=no-new-privileges",
    "--user",
    "10001",
    "--pids-limit",
    "256",
    "--memory",
    "1g",
    "--cpus",
    "1",
    "--network",
    PREVIEW_NETWORK,
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=256m",
    "--tmpfs",
    "/workspace/.next/cache:rw,noexec,nosuid,size=512m",
    "-v",
    `${resolvedWorkspace}:/workspace:ro`,
    "-w",
    "/workspace",
    "--env",
    `NODE_ENV=${nodeEnv}`,
    "--env",
    `SANDBOX_RUNTIME=${runtime}`,
    "--env",
    `PORT=${port}`,
    "--expose",
    String(port),
    "--publish",
    `127.0.0.1:${port}:${port}`,
  ];

  if (runtime === "runsc") {
    argv.push("--runtime=runsc");
  } else {
    argv.push(`--runtime=${runtime}`);
  }

  argv.push(
    PREVIEW_IMAGE,
    "npm",
    "run",
    "start",
    "--",
    "-p",
    String(port)
  );

  return argv;
}

export function buildStaticPreviewArgv({
  sessionId,
  workspaceDir,
  port,
  env = {},
}: BuildPreviewArgvInput): string[] {
  const argv = buildPreviewArgv({ sessionId, workspaceDir, port, env });
  const imageIndex = argv.indexOf(PREVIEW_IMAGE);
  if (imageIndex === -1) return argv;
  return [
    ...argv.slice(0, imageIndex + 1),
    "node",
    "/opt/revforge/static-server.mjs",
    "/workspace/out",
    String(port),
  ];
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function isStaticExport(workspaceDir: string): Promise<boolean> {
  if (await pathExists(path.join(workspaceDir, "out", "index.html"))) {
    return true;
  }

  for (const configName of ["next.config.ts", "next.config.js", "next.config.mjs"]) {
    try {
      const config = await fs.readFile(path.join(workspaceDir, configName), "utf8");
      if (/output\s*:\s*["']export["']/.test(config)) return true;
    } catch {
      // Missing config is not an error.
    }
  }

  return false;
}

async function runCommand(
  execFile: NonNullable<PreviewRuntimeDeps["execFile"]>,
  cmd: string,
  args: string[],
  cwd: string,
  timeout: number
): Promise<void> {
  try {
    await execFile(cmd, args, {
      cwd,
      shell: false,
      timeout,
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${cmd} ${args.join(" ")} failed: ${message}`);
  }
}

/**
 * Builds (when needed) and starts one preview container for an immutable
 * version workspace. The caller records the returned controller in
 * studio_preview_sessions; this function never mutates the workspace.
 */
export async function startPreview(
  input: {
    projectId: string;
    versionId: string;
    workspaceDir: string;
    sessionId?: string;
  },
  deps: PreviewRuntimeDeps = {}
): Promise<StartedPreview> {
  validateUuid(input.projectId, "projectId");
  validateUuid(input.versionId, "versionId");

  const sessionId = input.sessionId || crypto.randomUUID();
  validateUuid(sessionId, "sessionId");
  const now = deps.now || (() => Date.now());
  const env = deps.env || {};
  const port = deps.port || PREVIEW_DEFAULT_PORT;
  const workspaceDir = path.resolve(input.workspaceDir);

  if (!(await pathExists(path.join(workspaceDir, "package.json")))) {
    throw new Error("Preview workspace has no package.json.");
  }

  const execFile = deps.execFile || defaultExecFile;

  if (deps.build !== false) {
    const hasBuild =
      (await pathExists(path.join(workspaceDir, ".next"))) ||
      (await pathExists(path.join(workspaceDir, "out"))) ||
      (await pathExists(path.join(workspaceDir, "dist"))) ||
      (await pathExists(path.join(workspaceDir, "build")));

    if (!hasBuild) {
      const hasLock = await pathExists(path.join(workspaceDir, "package-lock.json"));
      await runCommand(
        execFile,
        "npm",
        [hasLock ? "ci" : "install", "--ignore-scripts"],
        workspaceDir,
        10 * 60 * 1000
      );
      await runCommand(
        execFile,
        "npm",
        ["run", "build"],
        workspaceDir,
        20 * 60 * 1000
      );
    }
  }

  const staticExport = await isStaticExport(workspaceDir);
  const argv = staticExport
    ? buildStaticPreviewArgv({ sessionId, workspaceDir, port, env })
    : buildPreviewArgv({ sessionId, workspaceDir, port, env });

  const result = await execFile("docker", argv, {
    timeout: 120_000,
    shell: false,
    maxBuffer: 4 * 1024 * 1024,
  });

  const containerId = String(result.stdout || "").trim();
  if (!containerId) {
    throw new Error("docker run did not return a container id.");
  }

  return {
    sessionId,
    containerId,
    internalPort: port,
    staticExport,
    startedAt: new Date(now()).toISOString(),
  };
}

export async function stopPreview(
  containerIdOrSessionId: string,
  deps: Pick<PreviewRuntimeDeps, "execFile"> = {}
): Promise<void> {
  if (
    !UUID_REGEX.test(containerIdOrSessionId) &&
    !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(containerIdOrSessionId)
  ) {
    throw new Error("Invalid preview container id.");
  }

  const execFile = deps.execFile || defaultExecFile;

  const target = UUID_REGEX.test(containerIdOrSessionId)
    ? `revforge-preview-${containerIdOrSessionId}`
    : containerIdOrSessionId;

  await execFile("docker", ["rm", "-f", target], {
    timeout: 20_000,
    shell: false,
  });
}

export function previewTtlRemaining(
  startedAt: Date,
  lastHeartbeatAt: Date,
  now: Date = new Date()
): { idleMs: number; hardMs: number; expired: boolean } {
  const idleMs =
    PREVIEW_IDLE_TTL_MS - (now.getTime() - lastHeartbeatAt.getTime());
  const hardMs =
    PREVIEW_HARD_TTL_MS - (now.getTime() - startedAt.getTime());

  return { idleMs, hardMs, expired: idleMs <= 0 || hardMs <= 0 };
}
