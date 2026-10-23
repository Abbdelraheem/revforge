# RevForge AI — System Threat Model (STRIDE)

This document provides a formal STRIDE threat model across the 8 primary architectural components of the RevForge clean-room reverse engineering and software reconstruction platform.

---

## 1. Web Frontend & Dashboard (`src/app/`, `src/middleware.ts`)

| Threat Category | Specific Threat | Impact | Technical Mitigation | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Session token forgery or cookie theft | Unauthorized access to user projects | Cryptographically signed, HTTP-only, Secure session cookies; SameSite=Lax. | `tests/unit/security.test.ts` |
| **Tampering** | Cross-Site Scripting (XSS) injecting malicious JS into dashboard | Session compromise, DOM theft | Nonce-based Content Security Policy (CSP); strict HTML escaping in React 19; `unsafe-eval` forbidden. | `tests/unit/headers.test.ts` |
| **Repudiation** | User denies initiating project analysis or order payment | Disputed transactions | Append-only `audit_log` recording user ID, IP address, timestamp, and action metadata. | `tests/integration/rls.test.ts` |
| **Information Disclosure** | Clickjacking embedding dashboard in malicious iframe | Account hijacking | Frame-ancestors `'none'` and `X-Frame-Options: DENY` on all application routes. | `tests/unit/headers.test.ts` |
| **Denial of Service** | Unauthenticated brute-force traffic on login or triage routes | Service degradation | Sliding-window IP rate limiter backed by Redis (`src/lib/security/rate-limiter.ts`). | `tests/unit/security.test.ts` |
| **Elevation of Privilege** | Normal user accessing superadmin routes (`/admin/*`) | Platform compromise | Server-side role validation in middleware and layout (`session.user.platformRole === "superadmin"`). | `tests/integration/studio-gate.test.ts` |

---

## 2. API & Webhook Ingestion (`src/app/api/`)

| Threat Category | Specific Threat | Impact | Technical Mitigation | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Forged webhook requests pretending to be Paddle payment confirmation | Fraudulent unpaid builds | Timing-safe HMAC-SHA256 signature verification with secret key; 300s timestamp window check. | `tests/integration/webhook.test.ts` |
| **Tampering** | Manipulated payment amounts (e.g. paying $1 for $720 build) | Financial loss | Strict verification asserting `order.amount_cents === webhook.amount_cents`. | `tests/integration/webhook.test.ts` |
| **Repudiation** | Replay of historical valid webhooks | Duplicate job execution | Idempotency ledger rejecting already-processed `event_id` and order state checks. | `tests/integration/webhook.test.ts`<br>`tests/integration/chaos.test.ts` |
| **Information Disclosure** | Verbose error stack traces or environment keys leaked in API responses | Reconnaissance | Structured error handling returning sanitized JSON without stack traces. | `tests/integration/health.test.ts` |
| **Denial of Service** | Malicious zip bomb uploaded via `/api/analysis/upload` | Worker disk exhaustion | Decompression bomb guard: max 500MB uncompressed, max 10,000 entries, compression ratio ceiling. | `tests/integration/upload.test.ts` |
| **Elevation of Privilege** | Server-Side Request Forgery (SSRF) targeting cloud metadata | AWS credential theft | `assertSafeUrl` resolving IP and blocking loopback, link-local, AWS metadata (169.254.169.254), and RFC1918. | `tests/integration/ssrf.test.ts`<br>`tests/unit/ssrf-payloads.test.ts` |

---

## 3. Background Worker Daemon (`workers/`, `src/lib/queue/`)

| Threat Category | Specific Threat | Impact | Technical Mitigation | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Malicious client injecting rogue jobs into BullMQ Redis queues | Unauthorized execution | Queue connections restricted to internal Redis network; jobs dispatched only via systemDb outbox. | `tests/integration/chaos.test.ts` |
| **Tampering** | Double-fulfillment or state corruption on crash | Financial/data loss | Checkpoint manager and atomic database transactions (`WorkspaceCheckpointManager`). | `tests/integration/chaos.test.ts` |
| **Repudiation** | Unacknowledged worker failures leaving jobs stuck | Customer dissatisfaction | Lease heartbeats in `worker_heartbeats` table; stuck-job reaper (`src/lib/worker/reaper.ts`). | `tests/integration/chaos.test.ts` |
| **Information Disclosure** | Secrets logged during build compilation or tool execution | Credential leakage | Pino logger with automatic redaction of bearer tokens, API keys, passwords, and PII. | `src/lib/observability/logger.ts` |
| **Denial of Service** | Worker deadlock or infinite loop in compilation | Worker starvation | Hard wall-clock timeout (`timeoutMs: 360_000`) and max iteration limits per job. | `tests/unit/sandbox-args.test.ts` |
| **Elevation of Privilege** | Worker container breakout to host filesystem | Host compromise | Worker executes unprivileged container runtimes; non-root host execution. | `scripts/sandbox-selftest.ts` |

---

## 4. Extraction & Compilation Sandbox (`src/lib/sandbox/`)

| Threat Category | Specific Threat | Impact | Technical Mitigation | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Container spoofing host identity or adjacent containers | Lateral movement | Isolated Docker network (`--network=none` for binaries; dedicated egress network for URLs). | `tests/unit/sandbox-args.test.ts` |
| **Tampering** | Binary modifying host files or escaping root directory | Host alteration | Strict `--read-only` rootfs, `--tmpfs /tmp:rw,noexec,nosuid`, and chroot fs-guard. | `scripts/sandbox-selftest.ts` |
| **Repudiation** | Untracked compilation script execution | Audit evasion | Safety scanner inspecting `package.json` for blocked lifecycle hooks (`postinstall`, etc.). | `tests/unit/delivery-packager.test.ts` |
| **Information Disclosure** | Access to AWS metadata or host network interfaces | Cloud credential theft | Outbound private RFC1918 subnets and 169.254.169.254 hard-blocked at firewall and DNS level. | `tests/integration/ssrf.test.ts` |
| **Denial of Service** | Fork-bomb or memory exhaustion attack | Host node crash | Hard container bounds: `--pids-limit 100`, `--memory 2g`, `--cpus 2`. | `scripts/sandbox-selftest.ts` |
| **Elevation of Privilege** | Container escape via setuid or Linux capabilities | Root host takeover | `--cap-drop=ALL`, `--security-opt=no-new-privileges`, `--user 10001:10001`, gVisor runsc in production. | `scripts/sandbox-selftest.ts` |

---

## 5. Studio Live Preview Runtime (`src/lib/studio/preview-runtime.ts`)

| Threat Category | Specific Threat | Impact | Technical Mitigation | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker impersonating preview session proxy | Cross-tenant preview access | Session token verified via HMAC; container labeled with exact UUID `revforge.preview=<sessionId>`. | `tests/unit/preview-runtime.test.ts` |
| **Tampering** | Previewed client app making unauthorized outbound requests | Botnet / SSRF abuse | Containers attached strictly to zero-egress internal preview bridge network. | `tests/unit/preview-runtime.test.ts` |
| **Repudiation** | Zombie preview containers exhausting host resources | Capacity loss | Dual TTL enforcement: 10-minute idle inactivity timeout + 60-minute hard absolute TTL. | `tests/unit/preview-runtime.test.ts` |
| **Information Disclosure** | Preview iframe accessing parent RevForge cookies | Session hijacking | Preview served on dedicated origin/subdomain; sandbox iframe attributes `sandbox="allow-scripts allow-forms"`. | `src/lib/studio/preview-runtime.ts` |
| **Denial of Service** | High volume of concurrent preview container launches | Resource exhaustion | Per-workspace concurrent preview limit enforced by governor (`PREVIEW_MAX_CONCURRENT`). | `tests/unit/preview-runtime.test.ts` |
| **Elevation of Privilege** | Privileged container breakout via preview dev-server | Host takeover | `--cap-drop=ALL`, `--security-opt=no-new-privileges`, `--user 10001`, runsc runtime. | `tests/unit/preview-runtime.test.ts` |

---

## 6. Object Storage (`src/lib/storage/`)

| Threat Category | Specific Threat | Impact | Technical Mitigation | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Forged presigned download URLs | Unauthorized download | Presigned URLs generated server-side with strict 15-minute expiration and sha256 signatures. | `tests/unit/delivery-authorize.test.ts` |
| **Tampering** | Overwriting existing delivery ZIP archives | Artifact corruption | S3 object versioning enabled; immutable storage keys using cryptographic UUIDs. | `tests/unit/delivery-packager.test.ts` |
| **Repudiation** | Unverified file transfers | Disputed delivery | SHA-256 checksums recorded in `CHECKSUMS.txt` for every archive entry. | `tests/unit/delivery-packager.test.ts` |
| **Information Disclosure** | Public S3 bucket access | Intellectual property leak | All S3 buckets configured with Block Public Access enabled; access strictly via IAM credentials. | `src/lib/storage.ts` |
| **Denial of Service** | Storage exhaustion via spam uploads | Billing explosion | Lifecycle policies auto-deleting raw evidence and unpurchased specs after 30 days. | `src/env.ts` |
| **Elevation of Privilege** | IAM credential theft via instance profile | Full AWS account breach | Least-privilege IAM policy restricted strictly to RevForge application buckets. | `docs/SECURITY.md` |

---

## 7. Payments Gateway (`src/lib/billing/`)

| Threat Category | Specific Threat | Impact | Technical Mitigation | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Man-in-the-middle forging checkout completion | Unearned service | Webhook authenticity verified using Paddle client public/secret keys. | `tests/integration/webhook.test.ts` |
| **Tampering** | Modifying quote parameters before checkout | Underpayment | Quotes cryptographically hashed and versioned; checkout generates fixed-price Paddle transaction. | `tests/integration/quote-versioning.test.ts` |
| **Repudiation** | Chargebacks or payment dispute claims | Financial penalty | Detailed event logs, attestation records, and delivered git archive proofs retained. | `tests/unit/margin.test.ts` |
| **Information Disclosure** | Credit card number leakage | PCI-DSS non-compliance | RevForge NEVER handles raw credit card data; all entry handled in Paddle hosted checkout iframe. | `src/app/(marketing)/dev/fake-checkout/page.tsx` |
| **Denial of Service** | Fraudulent checkout attempts triggering payment gateway bans | Gateway suspension | Per-IP checkout rate limiting and risk scoring via Paddle Radar fraud filters. | `src/lib/billing/provider.ts` |
| **Elevation of Privilege** | Unauthorized access to payout bank accounts | Theft of funds | Paddle Merchant of Record handles payouts; RevForge API keys have restricted webhook scopes. | `docs/PADDLE_REVIEW.md` |

---

## 8. LLM Prompt Injection & Untrusted Data Boundaries (`src/lib/prompts/`)

| Threat Category | Specific Threat | Impact | Technical Mitigation | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Jailbreak payloads impersonating system instructions | System prompt override | Input sanitization stripping XML closing tags; rigid `<untrusted>` delimiter fencing. | `tests/redteam/prompt-injection.test.ts` |
| **Tampering** | Model outputting poisoned code containing backdoors | Vulnerability injection | Safety scanner (`scanBuildSafety`) detecting blocked npm scripts, secrets, and known CVEs. | `tests/unit/delivery-packager.test.ts` |
| **Repudiation** | Unprovable model reasoning | Hallucination | Grounding contract: every claim in technical report must cite specific evidence IDs. | `tests/unit/prompts.test.ts` |
| **Information Disclosure** | Exfiltration of internal prompt directives or API keys | Intellectual property leak | Prompts explicitly forbid revealing system instructions; code never provides keys in context. | `tests/redteam/prompt-injection.test.ts` |
| **Denial of Service** | Token-exhaustion attack via prompt loops | Financial loss | Hard iteration ceiling, token accounting per call, and `COST_CAP_RATIO = 0.35`. | `tests/unit/margin.test.ts` |
| **Elevation of Privilege** | Untrusted payload instructing LLM to call privileged tools | Database tampering | Tools executed via strict TypeScript dispatcher (`src/lib/build/tools.ts`) with parameter validation. | `tests/unit/prompt-injection.test.ts` |
