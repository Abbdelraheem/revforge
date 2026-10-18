# RevForge AI — System Architecture Specification

## 1. High-Level Executive Overview

RevForge AI is an autonomous, Zero-Trust clean-room reverse engineering, technical scoping, and code generation SaaS platform. It enables software architects, engineering leaders, and security researchers to deconstruct live web applications, mobile packages (`.apk`), and native binaries (`PE/ELF/Mach-O/ASAR`) into verifiable architecture boundaries, an Evidence Ledger, and production-grade Next.js 15 clean-room source code.

```
+-----------------------------------------------------------------------------------+
|                           REVFORGE AI ARCHITECTURE                                |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [Client Browser / Studio]                                                        |
|         │                                                                         |
|         ▼ (HTTPS / POST /api/triage)                                              |
|  [Edge Security Gateway] ───► SSRF Guard (Pre-DNS Resolver)                       |
|         │                ───► Magic-Byte File Validator                           |
|         ▼                                                                         |
|  [Static Triage Pass]                                                             |
|         │                                                                         |
|         ├───► Architecture Boundaries (Frontend, Backend, DB, Security)           |
|         ├───► Evidence Ledger (Seen vs Inferred vs Unknown)                       |
|         └───► Dynamic 90% Unit Quoting Engine (Clean Rounded Prices: $29..$499)   |
|         │                                                                         |
|  [Paddle Billing Gate] (HMAC-SHA256 Webhook Unlock)                               |
|         │                                                                         |
|         ▼ (BullMQ Queue / Redis)                                                  |
|  [Reconstruction Worker]                                                          |
|         │                                                                         |
|         ▼ (Docker + gVisor `runsc` MicroVM / MOCK_SANDBOX)                        |
|  [Isolated Disassembly Sandbox]                                                   |
|         ├─── Headless Ghidra Decompiler                                           |
|         ├─── JADX APK Bytecode Unpacker                                           |
|         └─── Playwright Dynamic DOM Extractor                                     |
|         │                                                                         |
|         ▼ (rea-agents JSON-RPC Bus)                                               |
|  [Clean-Room Synthesis Worker]                                                    |
|         │                                                                         |
|         ▼ (Automated Compilation & Test Pass Guarantee)                           |
|  [Verified Output Package (.ZIP)] ◄─── SSE Telemetry Stream (Last-Event-ID)       |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Functional Modules

### 2.1 Universal Ingestion Gateway
- **URL Mode**: Inspects live web services, Google Play/App Store links, and Git repos.
- **Binary Upload Mode**: Ingests files up to 250MB, validates headers against known magic bytes (`0x7f454c46` for ELF, `MZ` for PE, `PK\x03\x04` for APK/ZIP), and assigns cryptographic UUID storage keys.
- **SSRF Defense**: Synchronously resolves target hostnames and enforces blocklists for RFC 1918 private IPs, loopback (`127.0.0.0/8`), link-local (`169.254.0.0/16`), multicast, and cloud metadata endpoints (`169.254.169.254`).

### 2.2 Evidence Ledger Taxonomy
To guarantee compliance with US (*Sega v. Accolade*, *Google v. Oracle*) and EU (Directive 2009/24/EC) clean-room reverse engineering law, the platform partitions extracted components into three legal tiers:
1. **Seen (Empirical)**: Directly observable client structures, exported REST/GraphQL routes, manifest files, and public CSS schemas.
2. **Inferred (Data Flow)**: High-confidence behavioral workflows deduced from client state mutations and network traffic patterns.
3. **Unknown / Server-Side**: Proprietary backend routines and databases synthesized from interface specifications alone, with zero access to original binary byte sequences.

### 2.3 Dynamic 90% Gross Margin Pricing Engine
RevForge replaces legacy agency hourly retainers with a deterministic cost-plus pricing model:
$$\text{COGS} = \text{Compute Seconds} \times \text{Rate} + \text{Model Tokens} \times \text{Token Rate} + \text{Storage}$$
$$\text{Target Price} = \frac{\text{COGS}}{1 - 0.90} = 10 \times \text{COGS}$$
$$\text{Final Quote} = \text{roundToCleanPrice}(\text{Target Price}) \in \{\$29, \$49, \$99, \$149, \$249, \$499\}$$

### 2.4 Cryptographic Webhook Gate
No reconstruction job is triggered via client-side state. The server only enqueues rebuild jobs upon receiving and validating a signed Paddle Billing v2 webhook (`Paddle-Signature` header with timestamp replay prevention).

### 2.5 MicroVM Sandboxing & Synthesis
- **gVisor Container Isolation**: Ephemeral containers run under `runsc` with `--network=none`, read-only root filesystems, dropped Linux capabilities, and non-root UID 10001 execution.
- **MOCK_SANDBOX Mode**: A built-in deterministic simulation mode (`MOCK_SANDBOX=true`) allowing complete local testing and UI evaluation without requiring native Ghidra or gVisor installations.
