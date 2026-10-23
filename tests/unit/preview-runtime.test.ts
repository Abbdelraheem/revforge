import { describe, it, expect } from "vitest";
import path from "node:path";
import {
  buildPreviewArgv,
  nextPreviewState,
} from "@/lib/studio/preview-runtime";

const SESSION_ID = "123e4567-e89b-42d3-a456-426614174000";
const WORKSPACE = "/srv/revforge/workspaces/project-1";

describe("preview runtime contract", () => {
  it("builds a hardened docker argv with separate entries", () => {
    const argv = buildPreviewArgv({
      sessionId: SESSION_ID,
      workspaceDir: WORKSPACE,
      port: 4100,
      env: { NODE_ENV: "production", SANDBOX_RUNTIME: "runsc" },
    });

    expect(argv[0]).toBe("run");
    expect(argv).toContain("--cap-drop=ALL");
    expect(argv).toContain("--read-only");
    expect(argv).toContain("--security-opt=no-new-privileges");
    expect(argv).toContain("--runtime=runsc");
    expect(argv).toContain(`revforge.preview=${SESSION_ID}`);
    expect(argv).toContain(`${path.resolve(WORKSPACE)}:/workspace:ro`);

    const userIndex = argv.indexOf("--user");
    expect(userIndex).toBeGreaterThan(-1);
    expect(argv[userIndex + 1]).toBe("10001");

    const networkIndex = argv.indexOf("--network");
    expect(networkIndex).toBeGreaterThan(-1);
    expect(["host", "bridge"]).not.toContain(argv[networkIndex + 1]);
  });

  it("rejects runc in production", () => {
    expect(() =>
      buildPreviewArgv({
        sessionId: SESSION_ID,
        workspaceDir: WORKSPACE,
        port: 4100,
        env: { NODE_ENV: "production", SANDBOX_RUNTIME: "runc" },
      })
    ).toThrow(/runsc/i);
  });

  it("rejects non-UUID session ids", () => {
    expect(() =>
      buildPreviewArgv({
        sessionId: "not-a-uuid",
        workspaceDir: WORKSPACE,
        port: 4100,
        env: { NODE_ENV: "development", SANDBOX_RUNTIME: "runc" },
      })
    ).toThrow(/UUID/i);
  });

  it("moves through the preview lifecycle", () => {
    expect(nextPreviewState("requested", "build_started")).toBe("building");
    expect(nextPreviewState("building", "build_succeeded")).toBe("starting");
    expect(nextPreviewState("starting", "start_succeeded")).toBe("ready");
    expect(nextPreviewState("ready", "stop_requested")).toBe("stopping");
    expect(nextPreviewState("stopping", "stopped")).toBe("stopped");
    expect(nextPreviewState("building", "build_failed")).toBe("error");
    expect(nextPreviewState("error", "retry")).toBe("requested");
    expect(nextPreviewState("ready", "heartbeat")).toBe("ready");
  });

  it("does not invent transitions", () => {
    expect(nextPreviewState("requested", "stopped")).toBe("requested");
    expect(nextPreviewState("ready", "build_started")).toBe("ready");
    expect(nextPreviewState("stopped", "start_succeeded")).toBe("stopped");
  });
});
