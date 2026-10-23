# RevForge System Status & Verification Report (V6)

Last Updated: October 2026
Audit Referee: `scripts/audit.mjs`

---

## 1. Executive Summary

RevForge provides an automated clean-room software reconstruction pipeline and post-delivery visual studio editor. All simulated build progress, fake tenant accessors, constant parity scores, fabricated ZIP keys, and silent fixture fallbacks have been removed and replaced with real, contract-bound implementations. 

Under V4 and V5, all delivery gates require real visual and behavioral measurement (minimum 80% parity coverage), runner fallbacks and mock keys are completely eradicated, model configurations and token rates are strictly configured from Anthropic published tables with startup assertions, filesystem guards block deep directory escapes (refusing `.git` and `node_modules` at any depth), and the build loop survives verifier runtime exceptions without rejecting.

### V6: Studio edits are now real

Before V6, Studio "edits" were non-functional and destructive. The worker overwrote each target file with a generated comment and `export default function Component() { return null; }`, overwrote every other file with `// Unmodified <path>`, invented `parityScore` (`parent ?? 0.88`), charged from an estimated `5000` tokens, and stored only a manifest plus a ZIP made of those placeholder strings. No builder ran, no build or test executed, no leakage/safety scan ran, and no guard could reject a broken result.

V6 replaces that path end to end:

- **Real files survive.** Every Studio version stores the full workspace ZIP in S3 and a real path/size/sha256 manifest in Postgres. An edit restores the parent version by unzipping its actual archive into an isolated temporary workspace; a new immutable version is created only after packaging the real edited workspace.
- **Real execution.** The edit pipeline runs baseline `verifyBuildWorkspace` (install, build, tests, screenshots, behavioral checks), `runBuildLoop` with the edit brief and acceptance criteria, Anthropic tool-use through `executeTool`, `createLeakageScanner` against the original reference corpus, `scanBuildSafety`, and final verification. Zero source changes is reported as `no_changes`, not as a successful edit.
- **Measured parity only.** The new version's `parityScore` is the verifier's measured `overall` value. Rejected edits never create a version and never charge.
- **Honest settlement.** `priceEdit`, `maxProviderCostForHold`, and `settleEdit` implement the pure pricing contract. Charges are computed from actual provider token spend (`calculateUsageCostCents`) plus the real enhancement cost, capped by the hold, with the floor applied only to accepted edits. `holdCredits` and `settleCredits` take the caller's transaction, use a per-workspace advisory lock, and settle idempotently.
- **Pure post-edit guard.** `evaluateEdit` rejects zero build health, overall regression beyond tolerance, or a coverage loss greater than 0.1.
- **Contract-shaped enhancement.** `enhancePrompt` validates model output with Zod, places user text and project context only in the untrusted payload, caps the payload below 30,000 characters, returns `{brief:null, clarification}` for high ambiguity, and appends code-owned invariants. The keyword deny-list and heuristic fallback are removed.
- **Tenant isolation.** User-facing Studio pages and API routes use `withTenant` through a shared loader; `authorizeStudio` is pure and takes the loaded session/project/orders/balance. The preview proxy re-runs that gate on every request and serves the requested file from the immutable version archive, returning 404 when the archive has no such file instead of synthesising a page.
- **Smoke coverage.** `npm run smoke` now runs a scripted Studio edit with the fixture enhancement call, asserts the produced version's real files differ from the parent, and extracts the produced ZIP and rebuilds/tests it. It still requires live Postgres, Redis, and S3.

### V7: pre-run blockers closed

V7 closes the defects found by running the application against a database built only from `drizzle/*.sql`:

- **The missing credit-ledger migration now exists.** `drizzle/0003_credits_ledger_kind.sql` adds `credits_ledger.kind` with a default, a `CHECK` constraint, and a backfill that infers historical `studio_hold`, `studio_settle`, `grant`, and `deduction` rows. The Drizzle schema and billing writes use the same five values (`grant`, `deduction`, `studio_hold`, `studio_settle`, `adjustment`). The journal now lists all four migrations, not just `0000`.
- **Schema drift is executable and wired into the test path.** `scripts/check-schema-drift.ts` creates a temporary database, applies every `drizzle/*.sql` file in order, introspects `information_schema.columns`, and compares every table, column, nullability, and default against `src/db/schema.ts`. `npm test` runs it after Vitest; CI uses `npm test` with a Postgres 16 service. The check is fatal when a database is available and `--require-db`/`REQUIRE_SCHEMA_DRIFT=1` is set, and skips with an explicit warning when no database can be reached locally.
- **No paid call before the hold.** `executeStudioEdit` now resolves and restores the parent, then performs `holdCredits` in the same transaction that marks the edit `held`. Only after that does it call `enhancePrompt`, then the build loop. The loop's provider-cost cap is reduced by the enhancement spend. An enhancer clarification returns `outcome: "no_changes"` and the shared settlement path refunds the entire hold.
- **Parity and tenant isolation were already correct in V6.** `studio-client.tsx` renders `NOT RECORDED` / `Not measured` when `parityScore` is null; the Studio page and API routes use `loadStudioRouteData`/`withTenant`; `systemDb` remains confined to the worker and admin paths.

### V7 verification (2026-10-23)

Commit: `c51d201` (`v7: close pre-run blockers with schema drift and credit hold ordering`).

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | 19 files / 230 tests pass; drift check skipped locally because nothing listens on `127.0.0.1:5432` |
| `npm run lint` | Pass |
| `npm run build` | Pass |
| `node scripts/audit.mjs --all` | T0–T7: 310/310 pass |
| Fresh Postgres from `drizzle/*.sql` | Pass: `33 tables / 296 columns match 4 migration files` |
| Negative control without `0003` | Fails as required: `missing column: credits_ledger.kind` |
| `npm run smoke` | **Blocked** (exit 1, no stages passed) |

The fresh-database check was run against a temporary embedded Postgres on port 55432, with all four SQL files applied by `check-schema-drift.ts`:

```text
[schema-drift] OK: 33 tables / 296 columns match 4 migration files (0000_wet_wrecking_crew.sql, 0001_rls_policies_and_audit_triggers.sql, 0002_studio_schema_and_rls.sql, 0003_credits_ledger_kind.sql).
```

Removing `0003` from that same fresh database produced the expected failure:

```text
[schema-drift] FAIL: 1 mismatch(es) between src/db/schema.ts and drizzle/*.sql
  - missing column: credits_ledger.kind
```

`npm run smoke` could not reach the live stack in this environment. Its actual output was:

```text
=== RevForge Live Wire Smoke Test (V6) ===
[1/8] Probing system health dependencies...
Health Probe Results: {
  "status": "down",
  "services": {
    "postgres": false,
    "postgresSystem": false,
    "redis": false,
    "s3": false,
    "docker": false,
    "worker": false
  },
  "timestamp": "2026-10-23T06:50:45.521Z"
}
FATAL: Required core services are DOWN: postgres, postgresSystem, redis, s3, docker, worker
```

Smoke therefore stops at stage 1 of 8. No live Studio edit, build, settlement, or ZIP round-trip has been claimed as passing.

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
