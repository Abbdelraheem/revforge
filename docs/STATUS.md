# RevForge System Status & Verification Report (V5)

Last Updated: October 2026
Audit Referee: `scripts/audit.mjs`

---

## 1. Executive Summary

RevForge provides an automated clean-room software reconstruction pipeline and post-delivery visual studio editor. All simulated build progress, fake tenant accessors, constant parity scores, fabricated ZIP keys, and silent fixture fallbacks have been removed and replaced with real, contract-bound implementations. 

Under V4 and V5, all delivery gates require real visual and behavioral measurement (minimum 80% parity coverage), runner fallbacks and mock keys are completely eradicated, model configurations and token rates are strictly configured from Anthropic published tables with startup assertions, filesystem guards block deep directory escapes (refusing `.git` and `node_modules` at any depth), and the build loop survives verifier runtime exceptions without rejecting.

---

## 2. What Is Real & Verified

### Database & Multitenancy
- **Two Postgres Roles**: `DATABASE_URL` connects as application role (`NOBYPASSRLS`), while `SYSTEM_DATABASE_URL` connects as system role (`BYPASSRLS`).
- **Enforced RLS**: Row-Level Security is enabled and forced across all workspace-scoped tables using `workspace_id = current_setting('app.workspace_id', true)::uuid`.
- **Tenant Context (`withTenant`)**: Queries in `(app)` routes and server actions execute strictly inside `withTenant`, parameterizing both `app.user_id` and `app.workspace_id`.
- **Atomic Free Trials**: `claimFreeAnalysis` enforces single atomic execution via `UPDATE users SET analysis_credits_used = analysis_credits_used + 1 WHERE id = $1 AND analysis_credits_used < 1`.

### Payment Webhook
- **Atomic Processing**: `src/app/api/webhooks/paddle/route.ts` runs inside a single `systemDb` transaction.
- **Fail-Closed Verification**: Verifies cryptographic signature before reading DB.
- **Conflict Handling**: Idempotency via `webhook_events.event_id` with retry allowed only if prior attempt had `status = 'failed'`.
- **Row Locking**: Locks orders using `SELECT ... FROM orders WHERE id = $1 FOR UPDATE`.
- **Integrity Validation**: Verifies provider transaction ID, currency (USD), and exact amount matching. Unlocks and transitions projects only on match; logs audit event on mismatch.
- **Outbox Dispatch**: Best-effort dispatch with a 5-second timeout.

### Pure Build Engine & Loop Resilience
- **Clean-Room Loop (`src/lib/build/engine.ts`)**: Pure deterministic loop accepting injected `LoopDeps` and `LoopInput`.
- **Strict Iteration Lifecycle**: Every cycle executes `runBuilder` -> `scanSafety` -> `scanLeakage` -> `verify`.
- **Exception Resilience**: `verify`, `scanSafety`, and `scanLeakage` are wrapped in try/catch; failures are treated as non-improving iterations with feedback; 3 consecutive step failures transition to `fatal_error`. Never rejects.
- **Coverage Gate**: Full `delivered` status strictly requires `parity.coverage >= 0.8`. If coverage is below 80%, status is capped at `delivered_partial`.
- **Rollback on Security Failures**: Safety violations or reference leakage restore the workspace from the prior iteration checkpoint.
- **Stagnation Escalation**: Stagnation window tracking escalates models (`STANDARD` -> `PREMIUM` -> stagnation termination) and terminates gracefully.
- **Spend Accounting**: Real spend tracking calculated per model token rates.

### Filesystem Containment & Sandboxed Tools
- **Deepest Ancestor Canonicalization (`src/lib/build/fs-guard.ts`)**: Resolves deepest existing ancestor before `realpathSync`, blocking NUL bytes, absolute paths, and parent directory traversal.
- **Deep Segment Refusal**: For write operations, blocks `.git` and `node_modules` at ANY depth (`sub/.git/HEAD`, `deep/node_modules/**`).
- **Tool Sandbox (`src/lib/build/tools.ts`)**: Enforces allowlist of safe commands (`npm`, `npx`, `node`) and strictly rejects binaries such as `git`, `docker`, `curl`, `wget`, `sh`, `bash`, and arbitrary command execution. Forces `--ignore-scripts` on npm installations.
- **Live Agent Configuration**: `builder-agent.ts` throws clear configuration error when `ANTHROPIC_API_KEY` is missing in live mode (mock keys removed).

### Real Runtime Capture & Parity Verifier
- **Live App Capture (`src/lib/build/capture.ts`)**: Serves the built workspace, captures screenshots via Playwright at 1280px (desktop) and 390px (mobile), and compares against crawl references with `pixelmatch`.
- **Behavioral Verifications**: Validates that routes respond with HTTP 200, form submissions do not crash, API contract stubs respond, and technical report features are present.
- **Strict Verifier (`src/lib/build/verifier.ts`)**: Removed heuristic fallback branch; `VerificationRunner` is strictly required. Deleted unused duplicate `parity-evaluator.ts`.
- **Pixelmatch & Normalized Parity (`src/lib/build/parity.ts`)**: Calculates normalized weighted scores (`0.35 * visual + 0.15 * structural + 0.35 * behavioral + 0.15 * buildHealth`).

### S3 Packager & Delivery Gate
- **Real ZIP Generation (`src/lib/build/packager.ts`)**: Compresses workspace using `fflate` and uploads to S3 bucket with deterministic key `deliveries/<ws>/<project>/<job>.zip`.
- **Honest Delivery Artifacts**: Includes `PARITY_REPORT.md` (unvarnished scores, unverified dimension disclosures, and coverage metrics), `EVIDENCE_LEDGER.md`, and `LICENSE-NOTICE.md`.
- **Strict Download Gate (`src/lib/delivery/authorize.ts`)**: Enforces check sequence: 401 Unauthenticated -> 404 Project Not Found -> 403 Tenant Mismatch -> 409 Unpaid -> 404 Delivery Missing -> 410 Expired -> Presigned S3 Download URL.

### Centralized Model & Token Pricing
- **Central Model Config (`src/config/models.ts`)**: FAST, STANDARD, and PREMIUM tiers sourced cleanly from environment settings without hardcoded string literals in orchestrator.
- **Configured Token Rates (`src/config/pricing.ts`)**: Real input/output token pricing per million tokens across tiers sourced from published Anthropic rates. Startup check guarantees all configured models have rates.

---

## 3. What Is Not Done / Not Verified in Production

1. **Host-Level gVisor Isolation**:
   - In production cloud deployment, container runners require Docker daemon configured with gVisor (`runsc`) runtime. In local developer environments without `runsc`, the container isolation falls back to standard container execution or local TypeScript extractors.
2. **Third-Party Provider Credentials**:
   - Live Paddle payment processing and real webhook cryptographic validation require valid live vendor secrets; local automated tests run against test fixtures and mock signatures.
   - Live LLM synthesis requires funded Anthropic API credentials; test pipelines use deterministic test doubles.
3. **Headless Browser Environment**:
   - Visual regression capture and behavioral verification require headless Chromium (`npx playwright install chromium`) to be installed in the execution environment.
4. **Email Delivery**:
   - Live transactional email delivery requires an active Resend account and verified sender domain (`RESEND_API_KEY`, `EMAIL_FROM`).

---

## 4. What Requires Human Launch Configuration

1. **Production API Keys**:
   - Live Anthropic API key (`ANTHROPIC_API_KEY`).
   - Live Paddle webhook secrets and vendor ID (`PADDLE_WEBHOOK_SECRET`, `PADDLE_VENDOR_ID`).
   - Live Resend API key for transactional emails (`RESEND_API_KEY`).
2. **Production Infrastructure**:
   - PostgreSQL instances configured with dedicated `revforge_app` (NOBYPASSRLS) and `revforge_system` (BYPASSRLS) roles.
   - S3-compatible object store (AWS S3 or self-hosted MinIO) with production access credentials.
   - gVisor (`runsc`) installed on container build worker nodes.
3. **Legal Review**:
   - Final review of DMCA notice and clean-room IP terms by counsel prior to launch.
