# RevForge System Status & Verification Report (V3)

Last Updated: October 2026
Audit Referee: `scripts/audit.mjs`

---

## 1. Executive Summary

RevForge has undergone a full architectural refactor under V3 ("STOP FAKING. MAKE IT REAL."). All simulated build progress, fake tenant accessors, constant parity scores, fabricated ZIP keys, and silent fixture fallbacks have been removed and replaced with real, contract-bound implementations.

---

## 2. What Is Real & Verified

### Database & Multitenancy (Section 1)
- **Two Postgres Roles**: `DATABASE_URL` connects as application role (`NOBYPASSRLS`), while `SYSTEM_DATABASE_URL` connects as system role (`BYPASSRLS`).
- **Enforced RLS**: Row-Level Security is enabled and forced across all workspace-scoped tables using `workspace_id = current_setting('app.workspace_id', true)::uuid`.
- **Tenant Context (`withTenant`)**: Queries in `(app)` routes and server actions execute strictly inside `withTenant`, parameterizing both `app.user_id` and `app.workspace_id`.
- **Atomic Free Trials**: `claimFreeAnalysis` enforces single atomic execution via `UPDATE users SET analysis_credits_used = analysis_credits_used + 1 WHERE id = $1 AND analysis_credits_used < 1`.

### Payment Webhook (Section 2)
- **Atomic Processing**: `src/app/api/webhooks/paddle/route.ts` runs inside a single `systemDb` transaction.
- **Fail-Closed Verification**: Verifies cryptographic signature before reading DB.
- **Conflict Handling**: Idempotency via `webhook_events.event_id` with retry allowed only if prior attempt had `status = 'failed'`.
- **Row Locking**: Locks orders using `SELECT ... FROM orders WHERE id = $1 FOR UPDATE`.
- **Integrity Validation**: Verifies provider transaction ID, currency (USD), and exact amount matching. Unlocks and transitions projects only on match; logs audit event on mismatch.
- **Outbox Dispatch**: Best-effort dispatch with a 5-second timeout.

### Pure Build Engine (Section 3)
- **Clean-Room Loop (`src/lib/build/engine.ts`)**: Pure deterministic loop accepting injected `LoopDeps` and `LoopInput`.
- **Strict Iteration Lifecycle**: Every cycle executes `runBuilder` -> `scanSafety` -> `scanLeakage` -> `verify`.
- **Rollback on Security Failures**: Safety violations or reference leakage restore the workspace from the prior iteration checkpoint.
- **Stagnation Escalation**: Stagnation window tracking escalates models (`STANDARD` -> `PREMIUM` -> stagnation termination) and terminates gracefully.
- **Spend Accounting**: Real spend tracking calculated per model token rates.

### Filesystem Containment & Tool Execution (Section 4)
- **Deepest Ancestor Canonicalization (`src/lib/build/fs-guard.ts`)**: Resolves deepest existing ancestor before `realpathSync`, blocking NUL bytes, absolute paths, and parent directory traversal.
- **Tool Sandbox (`src/lib/build/tools.ts`)**: Enforces allowlist of safe commands (`npm`, `npx`, `node`, `git`) and forbids arbitrary execution, shell escapes, and interactive flags. Forces `--ignore-scripts` on npm installations.

### Leakage Scanner & Parity Verifier (Sections 5 & 6)
- **Live Workspace Leakage (`src/lib/build/leakage-scanner.ts`)**: Reads live workspace files and scans against extracted reference corpus using shingled n-grams.
- **Pixelmatch & Normalized Parity (`src/lib/build/parity.ts`)**: Uses `pixelmatch` and `pngjs` for visual comparison, correctly handles `null` dimensions and calculates normalized weighted scores (`0.35 * visual + 0.15 * structural + 0.35 * behavioral + 0.15 * buildHealth`).
- **Real Build Verification (`src/lib/build/verifier.ts`)**: Executes `npm run build` inside workspace to measure real build health.

### S3 Packager & Delivery Gate (Sections 7 & 8)
- **Real ZIP Generation (`src/lib/build/packager.ts`)**: Compresses workspace using `fflate` and uploads to S3 bucket with deterministic key `deliveries/<ws>/<project>/<job>.zip`.
- **Honest Delivery Artifacts**: Includes `PARITY_REPORT.md` (unvarnished scores and null-dimension disclosures), `EVIDENCE_LEDGER.md`, and `LICENSE-NOTICE.md`.
- **Strict Download Gate (`src/lib/delivery/authorize.ts`)**: Enforces check sequence: 401 Unauthenticated -> 404 Project Not Found -> 403 Tenant Mismatch -> 409 Unpaid -> 404 Delivery Missing -> 410 Expired -> Presigned S3 Download URL.

### Analysis & Extractor Architecture (Sections 9 & 10)
- **Zero Silent Fixture Fallback (`src/lib/analysis/report-source.ts`)**: Live analysis failures throw `AnalysisFailedError` and issue platform credit refunds. Fixture mode is strictly blocked in production.
- **Argv Sanitization & Isolation (`src/lib/sandbox/runner.ts`)**: Validates UUIDs, constructs non-concatenated argv flags, enforces gVisor (`runsc`) in production, and provides automatic cleanup via container labels.

### Pricing Configuration (Section 11)
- **Configured Token Rates (`src/config/pricing.ts`)**: Real input/output token pricing per million tokens across FAST, STANDARD, and PREMIUM tiers.

---

## 3. What Is Limited (Development Fallbacks)

1. **Docker Extractor Execution**:
   - In production, extractors require Docker with gVisor (`runsc`).
   - In non-production local development without Docker running, runner falls back to standalone TypeScript extractors in `sandbox/extractors/`.
2. **Fixture Mode**:
   - Only permitted when `LLM_PROVIDER=fixture` AND `NODE_ENV !== "production"`.

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
