import { env } from "@/env";

export interface SandboxProfile {
  name: "analyze" | "crawl" | "verify";
  network: string;
  memoryLimit: string;
  pidsLimit: number;
  readOnlyRoot: boolean;
  user: string;
  tmpfs: string;
  runtime: string;
  defaultFlags: string[];
}

export const SANDBOX_PROFILES: Record<"analyze" | "crawl" | "verify", SandboxProfile> = {
  analyze: {
    name: "analyze",
    network: "--network=none",
    memoryLimit: "--memory=2g",
    pidsLimit: 256,
    readOnlyRoot: true,
    user: "--user=10001:10001",
    tmpfs: "--tmpfs /tmp:rw,noexec,nosuid,size=1g",
    runtime: env.NODE_ENV === "production" ? "runsc" : "runc",
    defaultFlags: [
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--read-only",
      "--pids-limit=256",
      "--network=none",
      "--user=10001:10001",
      "--memory=2g",
      "--tmpfs /tmp:rw,noexec,nosuid,size=1g",
    ],
  },
  crawl: {
    name: "crawl",
    network: "--network=egress_proxy_net",
    memoryLimit: "--memory=2g",
    pidsLimit: 512,
    readOnlyRoot: false,
    user: "--user=10001:10001",
    tmpfs: "--tmpfs /tmp:rw,noexec,nosuid,size=1g",
    runtime: env.NODE_ENV === "production" ? "runsc" : "runc",
    defaultFlags: [
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--pids-limit=512",
      "--user=10001:10001",
      "--memory=2g",
      "--tmpfs /tmp:rw,noexec,nosuid,size=1g",
    ],
  },
  verify: {
    name: "verify",
    network: "--network=egress_proxy_net",
    memoryLimit: "--memory=4g",
    pidsLimit: 1024,
    readOnlyRoot: false,
    user: "--user=10001:10001",
    tmpfs: "--tmpfs /tmp:rw,noexec,nosuid,size=2g",
    runtime: env.NODE_ENV === "production" ? "runsc" : "runc",
    defaultFlags: [
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--pids-limit=1024",
      "--user=10001:10001",
      "--memory=4g",
      "--tmpfs /tmp:rw,noexec,nosuid,size=2g",
    ],
  },
};
