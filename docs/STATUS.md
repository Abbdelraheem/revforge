# RevForge System Status & Verification Report (V8, in progress)

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

### V8 Part 1: live preview runtime

The old preview route served a source file directly out of the version ZIP. That route now has a real session lifecycle and proxies to a running container through the worker tunnel.

- **Pure argv contract.** `src/lib/studio/preview-runtime.ts` exposes `buildPreviewArgv({sessionId, workspaceDir, port, env})` and `nextPreviewState(state, event)`. The argv is separate array entries, includes `--cap-drop=ALL`, `--read-only`, `--security-opt=no-new-privileges`, `--user 10001`, pids/memory/CPU limits, a private `revforge-preview` network, a `revforge.preview=<sessionId>` label, a read-only workspace mount, and `--runtime=runsc`; production rejects `runc`.
- **Lifecycle.** Sessions are `requested → building → starting → ready → stopping → stopped | error`, with `lastError`, build logs, container id, internal port, heartbeat and timestamps in `studio_preview_sessions`. `drizzle/0004_preview_runtime.sql` adds these fields and `preview_tunnel_requests`.
- **Outbound worker tunnel.** `/api/worker/tunnel` authenticates a short-lived HMAC token from `PREVIEW_TUNNEL_SECRET`; the worker claims requests, forwards them to the loopback-published container port, and posts the response. `/api/studio/preview/[projectId]/[...path]` re-runs `authorizeStudio` on every request, strips cookies/Authorization, enforces response size/time limits, and returns a real 503/504 state instead of source files.
- **Worker.** `npm run preview:worker` restores the immutable version ZIP, builds when needed, starts the hardened container, waits for the server, heartbeats, enforces idle/hard TTLs, and stops containers. It requires Docker and the worker process to be online.
- **UI.** The Studio center pane has 390/768/1280 widths, route picker, start/stop, reload, open-in-new-tab, a real state badge, logs drawer, and a screenshot-compare notice. It only renders an iframe when the session is actually `ready`; otherwise it shows the real state without a fake spinner. No verified screenshot fallback is claimed because the current capture path does not persist screenshots.

**V8 Part 1 verification (local, 2026-10-23):** `npm run typecheck` pass; `npm test` 20 files / 235 tests pass (schema-drift skipped: no Postgres on `127.0.0.1:5432`); `npm run lint` pass; `npm run build` pass; `node scripts/audit.mjs --all` 310/310 pass. `npm run smoke` was not run to completion because Postgres/Redis/S3/Docker are not available locally; the smoke script now has a preview contract + fake-Docker stage, but it still cannot pass stage 1 without those services.

**Not claimed:** a live container start, a real tunnel round-trip, screenshot fallback persistence, or Playwright preview screenshots. These require Docker, the preview worker, and the live database/S3 stack.

### V8 Part 2: profit accounting

- **Cost ledger.** `drizzle/0005_cost_events.sql` adds the append-only, RLS-exempt `cost_events` table with `provider_cost_cents` plus `provider_cost_micros`, model, input/output tokens, source, and ref id. `src/lib/billing/costs.ts` appends a row from the real usage object; analysis, each build-loop builder call, and the Studio enhancer call now write rows. `calculateUsageCostMicros` uses the explicit `config/pricing.ts` table and throws for unknown models.
- **Pure margin contracts.** `src/lib/billing/margin.ts` implements `computeProjectMargin` and `computeStudioEditMargin`. Revenue recognizes cash payments minus refunds, deferred credit grants plus consumed credits; fees use `PAYMENT_FEE_PERCENT`/`PAYMENT_FEE_FIXED_CENTS`; provider cost sums micros; `byStage` is analysis/build/studio/preview; unspent credit is `liabilityCents`; `marginPct` is `null` when revenue is zero.
- **Admin page.** `/admin/margins` shows real per-project and per-day revenue, fees, provider cost, contribution, margin, and liability, with date/project filters, CSV export, an alert banner for `MARGIN_ALERT_PCT` and cost-cap hits, and a pricing-health card whose suggestions are labelled as computed suggestions.
- **Build margin guard.** Quote creation records the projected cost cap and flags `needsReview` when the projected spend would leave less than `MIN_BUILD_MARGIN_PCT` of the price. Customer-facing quote UI still shows only price/tokens, never provider cost.

**V8 Part 2 verification (local, 2026-10-23):** `npm run typecheck` pass; `npm test` 21 files / 238 tests pass; `npm run lint` pass; `npm run build` pass; `node scripts/audit.mjs --all` 310/310 pass. Schema drift remains skipped locally because no Postgres is listening. The margin page has not been viewed against live data because the smoke stack is unavailable; its numbers come from the same real tables and pure contract, with no demo rows.

### V8 Part 3: versioned prompts and eval harness

- **Exact contract.** `src/lib/prompts/index.ts` exports `getPrompt(role)` returning `{ system, version }` for `analyst`, `planner`, `builder`, `edit_planner`, and `edit_builder`. Every system string is static (no template placeholders), at least 1500 characters, contains lowercase `untrusted` and `unknown`, and the builder roles require `npm run build` plus tests. `PROMPT_VERSION` is `2026-10-23.v8`.
- **Role specifications.** The analyst prompt covers clean-room evidence statuses (`seen`, `inferred`, `unknown_server_side`), confidence, route/API/auth/entity/token/responsive/accessibility inventories, risks, a formula-based effort rubric, and two worked examples. The planner prompt covers ordered obligations, dependency DAG, testable acceptance ids, file layout, design tokens, and a unit/integration/route/build/visual test plan. The builder prompt covers workspace safety, the implement-and-verify loop, real behaviour, accessibility, and honest failure reporting. The edit planner prompt defines the minimal brief, original-language handling, existing-file-only targets, one-question clarification, and safety refusals. The edit builder prompt requires inspection, minimal diffs, real verification, and no test weakening.
- **Wiring.** Analysis uses `getPrompt("analyst")`; build agents use `getPrompt("builder")`; Studio’s enhancer uses `getPrompt("edit_planner")`; Studio’s builder uses `getPrompt("edit_builder")`. `drizzle/0006_prompt_versions.sql` adds `prompt_version` to `technical_reports`, `build_jobs`, and `studio_edits`, and the creation paths write the active version.
- **Evaluation.** `npm run prompts:eval` runs five offline fixtures plus static checks for all five roles. `npm run prompts:live` is an opt-in model-backed smoke test that refuses to run in CI and requires `ANTHROPIC_API_KEY` and `LLM_MODEL_FAST`. It has not been run locally.

**V8 Part 3 verification (local, 2026-10-23):** `npm run typecheck` pass; `npm run prompts:eval` 5 roles / 5 fixtures pass; `npm test` 22 files / 241 tests pass (schema drift skipped: no Postgres); `npm run lint` pass; `npm run build` pass; `node scripts/audit.mjs --all` 310/310 pass. `prompts:live` was not run because that requires a real API key and spending; it is not part of CI.

### V8 Part 4: Studio UX completion

- **Asynchronous edit execution.** `POST /api/studio/edits` now validates the workspace balance, locks the project row, rejects a second active edit with `409 edit_in_progress`, returns `402 insufficient_tokens` with the real balance and required hold when the balance is short, creates the edit, and returns `202` with an edit id and stream URL. The worker continues in the Node process; the browser never receives a fabricated completion.
- **Real status stream.** `GET /api/studio/edits/[editId]/events` is a tenant-checked Server-Sent Events stream that polls the persisted edit row, emits only changes, sends heartbeats, and closes on `committed`, `failed`, or `refunded`. The Studio client falls back to real polling if `EventSource` is unavailable or disconnects. The timeline is the sequence of statuses actually received.
- **Cancellation with full release.** `POST /api/studio/edits/[editId]/cancel` locks the edit, writes `cancel_requested`, releases the entire `studio_hold:<editId>` as `studio_release:<editId>`, and marks the row `refunded` with zero settlement. The worker checks cancellation before the hold, after interpretation, before final verification, before packaging, and before inserting a version. `settleCredits` refuses to settle after a release, so a late worker cannot both release and charge.
- **Chat and composer.** The Studio left pane is a real edit timeline with per-edit status, failure reason, diff stat, hold/settlement, quick prompt chips, keyboard submission, a cancel control, and a real token balance. It does not say an edit is instant or verified before the worker reports it.
- **Token purchase.** `POST /api/studio/tokens` accepts only the three configured packs (`$10`, `$25`, `$50`), creates a `studio_pack` order, and returns the payment provider checkout URL. The signed webhook grants exactly the paid subtotal to the append-only credit ledger; it no longer enqueues an analysis for a studio pack.
- **Version and evidence panes.** `code`, `tests`, `parity`, and `history` tabs replace the old mixed pane. `code` shows the stored file manifest, `tests` states that raw test output is not persisted and does not claim pass/fail, `parity` shows only a stored score, and `history` shows persisted edits. Mobile has real `Chat`, `Preview`, and `Details` panes.
- **Migration.** `drizzle/0007_studio_cancel.sql` adds `studio_edits.cancel_requested`.

**V8 Part 4 verification (local, 2026-10-23):** `npm run typecheck` pass; `npm test` 23 files / 243 tests pass (schema drift skipped: no Postgres); `npm run lint` pass; `npm run build` pass, including the new edit, cancel, events, and token routes; `node scripts/audit.mjs --all` 310/310 pass. The full Studio edit flow, cancellation race, token webhook, and SSE stream were not exercised against live Postgres/Redis/S3/worker because that stack is not running locally. No live browser session was used for this part.

### V8 Part 5: Delivery, Git history, deploy guide, and retention

- **Delivery page.** `/projects/[id]/delivery` reads the current project, paid orders, latest build job, delivery row, Studio versions, and Git archive rows through `withTenant`. It exposes real build status, version metadata, SHA-256, archive size, file count, creation/expiry times, and a version-by-version download list. Missing delivery rows, unpaid builds, expired archives, and cross-tenant projects are shown as states rather than replaced with demo data.
- **Version-aware downloads.** `GET /api/download/[projectId]` accepts `versionId` and authorizes the selected Studio version against the same paid-build, delivered-status, delivery-present, and expiry gate. It returns a 300-second S3 presigned URL and audits the version id and number. The gate now treats the exact expiry instant as HTTP 410.
- **Archive contents.** `packageDelivery` writes `DEPLOY.md`, `DELIVERY_METADATA.json`, and a real `CHECKSUMS.txt` covering every archived file except the checksum file itself. The unit suite unzips a delivered fixture, verifies every checksum against its bytes, confirms `.env` and `node_modules` are excluded, and confirms unmeasured parity dimensions are reported as `NOT VERIFIED`.
- **Git ZIP with history.** `src/lib/delivery/git-archive.ts` builds a temporary repository with the system `git` executable, writes each stored Studio version snapshot, deletes files removed between versions, and creates one commit per version using the version's actual creation timestamp. The returned ZIP contains `.git`. A unit test extracts it and proves the commit order, author dates, parent file state, and HEAD all match the real version records.
- **Git archive API.** `POST /api/projects/[id]/delivery/git` reuses an unexpired archive for the current source version or generates a new one, stores it in S3, records `delivery_git_archives` with commit count, HEAD, hash, size, and expiry, and returns a signed URL. `GET /api/projects/[id]/delivery/git/[archiveId]` rechecks authorization and expiry before redirecting.
- **GitHub push.** `POST /api/projects/[id]/delivery/github` is disabled unless `ENABLE_GITHUB_PUSH=true` and `GITHUB_TOKEN` is set. It builds the same real Git history and pushes to an existing `owner/name` repository with `git push`; tokens are redacted from returned errors. The delivery page explains that the flag is off by default.
- **Delivery email.** The build orchestrator sends a best-effort delivery email after the delivery row is stored. `POST /api/projects/[id]/delivery/resend` rechecks authorization and retention, sends the email again, and audits success or failure. Email links point to the authenticated delivery page, never to a long-lived storage credential.
- **Retention.** `DELIVERY_RETENTION_DAYS` defaults to `90` and is written into build delivery expiry; Studio versions use the same value from their real `created_at`. Expired source, version, and Git archive downloads return HTTP 410.
- **Migration.** `drizzle/0008_delivery_git_archives.sql` adds `delivery_git_archives` with forced RLS and the same `NULLIF(current_setting(...))` tenant policy used by the existing tables.

**V8 Part 5 verification (local, 2026-10-23):** `npm run typecheck` pass; `npm test` 26 files / 255 tests pass (schema drift skipped: no Postgres); `npm run lint` pass; `npm run build` pass, including the delivery page and all four delivery API routes; `node scripts/audit.mjs --all` 310/310 pass. The Git archive test executed the real local `git` binary and verified two commits. Not exercised locally: S3 upload/presign, Postgres migration execution, Resend delivery, and GitHub push (feature flag off and no token). No live browser session was used for this part.

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
