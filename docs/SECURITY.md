# RevForge AI — Security Architecture & Hardening Guide

## 1. Zero-Trust Security Philosophy

RevForge AI treats every ingested artifact—whether a public URL, an APK package, an ASAR bundle, or a native executable—as potentially hostile. The platform enforces defense-in-depth across six distinct architectural layers:

```
[Layer 1] Edge Input Validation (Magic Bytes & DNS SSRF Guard)
       │
[Layer 2] Subprocess Isolation (Zero-Shell child_process.execFile)
       │
[Layer 3] Container Virtualization (gVisor runsc, non-root, --network=none)
       │
[Layer 4] LLM Boundary Protection (<untrusted_artifact_evidence> delimiters)
       │
[Layer 5] Server-Side Financial Authorization (HMAC-SHA256 Webhooks)
       │
[Layer 6] Cryptographic Zero-Retention Vaults (AES-256, 24-hr wipe)
```

---

## 2. Security Controls & Defense Mechanisms

### 2.1 SSRF (Server-Side Request Forgery) Prevention
The `validateTargetUrl` module performs synchronous DNS resolution prior to initiating any HTTP connection. The target IP address is validated against an exhaustive deny-list:
- `127.0.0.0/8` (Loopback addresses)
- `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (RFC 1918 Private networks)
- `169.254.0.0/16` (Link-local addresses)
- `169.254.169.254` (AWS, GCP, Azure, OpenStack instance metadata services)
- `::1`, `fc00::/7`, `fe80::/10` (IPv6 loopback, ULA, and link-local ranges)

### 2.2 Magic-Byte Verification & Path Traversal Sanitization
File extensions are never trusted. All uploaded buffers are inspected for authentic file headers:
- ELF Binaries: `0x7f 0x45 0x4c 0x46`
- PE Executables: `0x4d 0x5a` (`MZ`)
- Android APK / ZIP archives: `0x50 0x4b 0x03 0x04`
- HAR Captures: Validated JSON structure with `{ "log": { ... } }`

Filename sanitization strips directory traversal sequences (`../`, `..\`), null bytes (`%00`), and non-ASCII shell metacharacters, enforcing clean alphanumeric identifiers.

### 2.3 Zero-Shell Subprocess Execution
No system commands are ever invoked through shell interpreters (`/bin/sh`, `/bin/bash`, `cmd.exe`, or `powershell.exe`). All external tooling is executed strictly using:
```typescript
import { execFile } from "node:child_process";
execFile(executablePath, args, { shell: false, env: minimalEnv });
```
This architectural invariant completely eliminates command injection vectors (e.g. `; rm -rf`, `&& calc.exe`).

### 2.4 Prompt Injection Mitigation
Untrusted strings, decompiled method names, and scraped web content are isolated inside XML-delimited envelopes before transmission to AI models:
```xml
<untrusted_artifact_evidence>
  <![CDATA[
    ... extracted disassembly text ...
  ]]>
</untrusted_artifact_evidence>
```
The model's system prompt strictly instructs it to interpret enclosed text exclusively as passive data, ignoring any embedded instructions or prompt manipulation attempts.

### 2.5 gVisor Container Sandboxing
Production disassembly containers execute under the gVisor (`runsc`) user-space kernel runtime with the following hard flags:
- `--network=none` (Air-gapped networking; zero external socket creation)
- `--read-only` (Read-only root filesystem)
- `--cap-drop=ALL` (All Linux capabilities dropped)
- `--user=10001:10001` (Unprivileged user execution)
- Strict memory (`512MB`–`2GB`) and CPU quotas (`0.5`–`2.0` cores)

---

## 3. Vulnerability Disclosure & Incident Reporting

For security disclosures or suspected vulnerabilities, please encrypt reports using our PGP public key:
- **Email**: `security@revforge.ai`
- **PGP Fingerprint**: `7F92 B04C E18A 992D 31E4 52B0 8891 0F2A B6C1 4410`
- **SLA**: Triage within 4 hours; patch deployment within 24 hours.
