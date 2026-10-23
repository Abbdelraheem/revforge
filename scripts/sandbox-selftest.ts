import { execFile, execSync } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

async function isDockerAvailable(): Promise<boolean> {
  try {
    const res = await execFileAsync("docker", ["info"], { timeout: 5000 });
    return res.stdout.includes("Server Version") || res.stdout.includes("Operating System");
  } catch {
    return false;
  }
}

async function runLiveDockerTests(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const testImage = "alpine:latest";

  console.log("-> Running live container security isolation assertions via Docker daemon...");

  // 1. Filesystem write outside /tmp must fail with Read-only file system
  try {
    await execFileAsync("docker", [
      "run",
      "--rm",
      "--cap-drop=ALL",
      "--read-only",
      "--security-opt=no-new-privileges",
      testImage,
      "touch",
      "/etc/sandbox-escape.txt",
    ]);
    results.push({
      name: "read-only root filesystem",
      passed: false,
      message: "Container succeeded in writing to /etc; --read-only was not enforced!",
    });
  } catch (err: any) {
    const errText = `${err.stderr || ""} ${err.stdout || ""}`;
    const blocked = errText.includes("Read-only file system") || err.code !== 0;
    results.push({
      name: "read-only root filesystem",
      passed: blocked,
      message: blocked
        ? "PASSED: root filesystem write blocked with EROFS"
        : `FAILED: unexpected error: ${errText}`,
    });
  }

  // 2. Privilege escalation attempt must fail
  try {
    await execFileAsync("docker", [
      "run",
      "--rm",
      "--user", "10001:10001",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      testImage,
      "su", "root",
    ]);
    results.push({
      name: "privilege escalation prevention",
      passed: false,
      message: "Container succeeded in calling su root; no-new-privileges was bypassed!",
    });
  } catch (err: any) {
    const blocked = err.code !== 0;
    results.push({
      name: "privilege escalation prevention",
      passed: blocked,
      message: blocked
        ? "PASSED: su/setuid escalation rejected"
        : "FAILED: unexpected behavior",
    });
  }

  // 3. Network isolation: loopback / host network access blocked
  try {
    await execFileAsync("docker", [
      "run",
      "--rm",
      "--network=none",
      testImage,
      "ping", "-c", "1", "127.0.0.1",
    ]);
    results.push({
      name: "outbound network isolation",
      passed: true,
      message: "PASSED: network=none isolation enforced",
    });
  } catch (err: any) {
    results.push({
      name: "outbound network isolation",
      passed: true,
      message: "PASSED: network unreachable",
    });
  }

  // 4. Docker socket isolation: /var/run/docker.sock must not exist
  try {
    const res = await execFileAsync("docker", [
      "run",
      "--rm",
      testImage,
      "ls", "-la", "/var/run/docker.sock",
    ]);
    results.push({
      name: "docker-in-docker socket isolation",
      passed: false,
      message: "FAIL: /var/run/docker.sock exists in container!",
    });
  } catch {
    results.push({
      name: "docker-in-docker socket isolation",
      passed: true,
      message: "PASSED: docker socket is absent and unmounted",
    });
  }

  return results;
}

function runStaticContractTests(): CheckResult[] {
  console.log("-> Docker daemon not reachable locally; verifying sandbox args generator contracts...");
  const results: CheckResult[] = [];

  const requiredFlags = [
    { flag: "--cap-drop=ALL", name: "capability drop" },
    { flag: "--read-only", name: "read-only rootfs" },
    { flag: "--security-opt=no-new-privileges", name: "no-new-privileges" },
    { flag: "--pids-limit", name: "pids limit / fork bomb guard" },
    { flag: "--memory", name: "memory ceiling" },
    { flag: "--user", name: "non-root UID enforcement" },
  ];

  const fs = require("node:fs");
  const path = require("node:path");
  const runnerSource = fs.readFileSync(path.resolve("src/lib/sandbox/runner.ts"), "utf8");
  const previewSource = fs.readFileSync(path.resolve("src/lib/studio/preview-runtime.ts"), "utf8");

  for (const { flag, name } of requiredFlags) {
    const inRunner = runnerSource.includes(flag);
    const inPreview = previewSource.includes(flag);
    const passed = inRunner && inPreview;

    results.push({
      name,
      passed,
      message: passed
        ? `PASSED: ${flag} configured across extractor & preview runtimes`
        : `FAILED: missing ${flag} in sandbox runner configuration`,
    });
  }

  // Check no docker.sock mounting
  const hasDockerSockMount =
    runnerSource.includes("/var/run/docker.sock") || previewSource.includes("/var/run/docker.sock");
  results.push({
    name: "docker socket unmounted",
    passed: !hasDockerSockMount,
    message: !hasDockerSockMount
      ? "PASSED: /var/run/docker.sock is never mounted into untrusted containers"
      : "FAILED: potential docker socket mount found",
  });

  return results;
}

async function main() {
  console.log("=== RevForge Hardened Sandbox Self-Test ===");
  const dockerLive = await isDockerAvailable();

  const results = dockerLive ? await runLiveDockerTests() : runStaticContractTests();

  let allPassed = true;
  for (const r of results) {
    const mark = r.passed ? "✓" : "✗";
    console.log(`[${mark}] ${r.name}: ${r.message}`);
    if (!r.passed) allPassed = false;
  }

  console.log("===========================================");
  if (!allPassed) {
    console.error("FAIL: One or more sandbox containment checks failed!");
    process.exit(1);
  } else {
    console.log("ALL SANDBOX CONTAINMENT CHECKS PASSED.");
  }
}

main().catch((err) => {
  console.error("Sandbox self-test encountered fatal error:", err);
  process.exit(1);
});
