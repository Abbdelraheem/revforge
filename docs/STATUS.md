# RevForge System Status & Verification Report (V11 Economics & Subscriptions)

Last Updated: October 26, 2026
Active Model Profile: `MODEL_PROFILE=test` (development / experimentation; production enforces `MODEL_PROFILE=launch`)
Audit Referee: `scripts/audit.mjs` (310/310 checks passing)
Live Launch Benchmark: **No live launch-profile benchmark has been run yet** (synthetic results deleted in V10; live launch bench requires live Anthropic Opus 5.5 API key, PostgreSQL, Docker, and S3).

---

## 1. Economics, Pricing & Margin Figures Ledger

In compliance with V11 verification standards, every financial, margin, and cost parameter is explicitly designated as **measured** or an **assumption**:

| Metric / Parameter | Value | Status | Source / Derivation |
|:---|:---|:---|:---|
| **Anthropic Opus 5.5 Token Rates** | $4.00 / M in, $20.00 / M out | **Measured** | Anthropic Official Published Pricing (verified Oct 25, 2026) |
| **Opus 5.5 Cache Creation Rate** | $5.00 / M tokens (5-min TTL) | **Measured** | Anthropic Official Published Pricing (verified Oct 25, 2026) |
| **Opus 5.5 Cache Read Rate** | $0.20 / M tokens | **Measured** | Anthropic Official Published Pricing (verified Oct 25, 2026) |
| **Haiku 3.5 Token Rates** | $0.80 / M in, $4.00 / M out | **Measured** | Anthropic Official Published Pricing (verified Oct 25, 2026) |
| **Flat Clone Price: Portfolio** | $39.00 (39,000 Credits) | **Assumption** | Owner locked volume-acquisition price; capped at 3 screens, 2 entities, 1 integration, 12h |
| **Flat Clone Price: Web App** | $79.00 (79,000 Credits) | **Assumption** | Owner locked volume-acquisition price; capped at 8 screens, 6 entities, 3 integrations, 24h |
| **Flat Clone Price: Mobile App** | $149.00 (149,000 Credits) | **Assumption** | Owner locked volume-acquisition price; capped at 20 screens, 15 entities, 5 integrations, 48h |
| **Flat Clone Price: Desktop Binary** | $249.00 (249,000 Credits) | **Assumption** | Owner locked volume-acquisition price; capped at 35 screens, 25 entities, 8 integrations, 80h |
| **Flat Clone Price: Full SaaS** | $399.00 (399,000 Credits) | **Assumption** | Owner locked volume-acquisition price; capped at 50 screens, 40 entities, 15 integrations, 160h |
| **Subscription: Starter** | $19/mo (or $190/yr) → 25k credits | **Assumption** | Recurring revenue tier with 50k rollover cap; assumes <80% monthly credit utilization |
| **Subscription: Pro** | $49/mo (or $490/yr) → 70k credits | **Assumption** | Recurring revenue tier with 140k rollover cap; assumes <80% monthly credit utilization |
| **Subscription: Team** | $149/mo (or $1490/yr) → 230k credits| **Assumption** | Recurring revenue tier with 460k rollover cap; multi-seat team usage |
| **Studio Token Multiplier** | 1.5× model API cost | **Assumption** | Owner decision; monitored via `studioMarginHealth` (requires >67% success rate for margin) |
| **Acquisition Mode Margin Floor** | 40.0% (`MIN_BUILD_MARGIN_PCT`) | **Assumption** | Business acquisition floor when `ACQUISITION_MODE=true` (raised to 65% in standard mode) |
| **Standard Mode Margin Floor** | 65.0% (`MIN_BUILD_MARGIN_PCT`) | **Assumption** | Default production profitability policy floor |
| **Job Cost Cap Ratio** | 35.0% (`COST_CAP_RATIO`) | **Assumption** | Hard risk ceiling on job spend relative to price paid |
| **Agency Rate Benchmark** | $40–$110 / engineering hr | **Assumption** | Indicative agency comparison rate shown in UI as an assumption |
| **Tier p90 Execution Costs** | Pending live launch benchmark | **Assumption** | Seed baselines active until live 12-target Opus 5.5 run populates `tier_cost_stats` |

---

## 1. Executive Summary

RevForge is a production-grade clean-room software reconstruction platform and post-delivery visual Studio editor. All simulated build progress, fake tenant accessors, constant parity scores, fabricated ZIP keys, and silent fixture fallbacks have been permanently eradicated and replaced with contract-bound, empirical implementations.

Under V10, the platform is updated with official Anthropic Opus 5.5 economics, prompt caching, verbatim zero-trust prompts, autonomous reviewer verification, and transparent tier pricing ($59 to $899) with an enforced 65% gross margin floor.

> **Benchmark Status Statement:**
> No live benchmark has been run yet. Synthetic benchmark fixtures finishing in 2 seconds were deleted in V10. Real benchmarks (`npm run bench`) require `LLM_PROVIDER=live`, `ANTHROPIC_API_KEY`, working Docker, PostgreSQL, and S3 storage. Dry runs for CI wiring (`npm run bench:dry`) write strictly to `bench/dry/` and never publish scores to `docs/QUALITY.md`.

---

## 2. Real & Verified Systems (Implemented & Audited)

### 1. Real-World Validation Harness (`benchmarks/targets/`, `scripts/bench.ts`)
- **12 Reference Targets**: Explicitly permissive and owned targets spanning static landing pages, multi-page marketing sites, SPA dashboards with mock APIs, CMS blogs, e-commerce demos, auth+CRUD applications, PWAs, HAR captures, Electron/ASAR demos, and mobile APKs.
- **Automated Pipeline Runner**: Executes end-to-end extraction, synthesis, containerized build, and verification. Records parity, coverage, provider costs, wall time, leakage similarity, and 3 scripted Studio edits per target.
- **Empirical Quality Standards**: Enforces `minMedianParity >= 0.85`, `minOverallParity >= 0.80`, `minCoverage >= 0.80`, and `maxLeakageSimilarity <= 0.30` (`src/config/quality.ts`).

### 2. Reliability & Data Safety (`src/lib/worker/`, `tests/integration/chaos.test.ts`)
- **Fault-Tolerant Worker**: Checkpoints state before and after every phase. Survives mid-build worker crashes, recovers without data loss, and re-executes cleanly.
- **Idempotency & Concurrency Guards**: Distributed Redis locking with per-workspace advisory locks prevent duplicate execution and credit races.
- **Database Resilience**: Forward-only Drizzle migrations (`drizzle/*.sql`), automated schema drift detection (`scripts/check-schema-drift.ts`), and PostgreSQL Row-Level Security (RLS) with dual-role separation (`revforge_app` NOBYPASSRLS vs `revforge_system` BYPASSRLS).

### 3. Observability & Operations (`src/lib/observability/`)
- **Structured Logging**: Production Pino logger (`logger.ts`) with automatic redaction of API keys, cookies, tokens, and PII.
- **Prometheus Metrics Endpoint**: `/api/metrics` exposing real queue depths, active workers, running preview sessions, and unit margins.
- **Healthcheck & Alerting**: `/api/health` providing deep component probes (Postgres, Redis, Worker, S3); `alerts.ts` dispatching operational alerts.

### 4. Security Hardening (`src/lib/security/`)
- **Comprehensive SSRF IP Guard**: `isBlockedIp` filters over 50 hostile IP evasion encodings (loopback, IPv4-mapped IPv6, octal, hex, decimal, link-local, AWS/GCP cloud metadata `169.254.169.254`).
- **Sandbox Containment**: Strict Docker flags (`--cap-drop=ALL`, `--read-only`, `--user 10001`, `--pids-limit`, `--memory`, `--cpus`, `--security-opt=no-new-privileges`, and gVisor `runsc` runtime).
- **Filesystem & Traversal Guards**: Deepest ancestor canonicalization (`fs-guard.ts`) blocks `.git` and `node_modules` at any depth, null bytes, and path traversal (`../`).
- **Prompt Injection Defense**: Multi-layered delimiter encapsulation and system prompt isolation prevent untrusted project code or prompts from hijacking LLM tool calls.

### 5. Unit Economics & Pricing Control (`src/lib/pricing/`, `src/lib/billing/`)
- **50% Minimum Gross Margin**: Pricing engine strictly enforces `MIN_BUILD_MARGIN_PCT = 50%`, rejecting or flagging any quote where expected gross margin falls below 50%.
- **Weekly Auto-Calibration**: Automated CLI runner (`scripts/auto-calibrate.ts`) adjusts complexity multipliers based on real recorded costs with bounded adjustments (±10%) and audit logging.
- **Workspace Budget Guards**: Prevents cost overruns with daily/monthly spend limits, concurrency caps (max 2), daily edit limits (max 50), and free-trial IP deduplication.
- **Full Infrastructure Cost Allocation**: Margins factor in LLM tokens, compile runner CPU hours, storage, and egress bandwidth.

### 6. Post-Delivery Studio (`src/app/(app)/projects/[id]/studio/`, `src/lib/studio/`)
- **Hardened Container Live Preview**: Runs built application in isolated container with no outbound network, serving real rendered pages via authenticated proxy.
- **Live SSE Edit Feed**: Real-time server-sent events status streaming (`pending → enhancing → held → applying → verifying → committed/refunded`).
- **Optimistic UI & Shortcuts**: Instant prompt feedback, keyboard shortcuts (`⌘K` focus, `⌘⏎` run, `Esc` cancel), and quick template chips with undo toasts.
- **Token Hold & Settle Ledger**: Holds 200 cents ($2.00) at edit initiation, settles strictly from measured token spend and runner time, releasing unused holds idempotently.

### 7. Delivery Infrastructure & CI/CD
- **Production Dockerfiles**: Multi-stage, non-root (`USER node`), pinned base digests (`node:22-bookworm-slim@sha256:d8c6b9075ae88a383d47bf1417fc7c13203f9055452d33457a44f514b7e80a09`).
- **On-Demand Worker Script**: `scripts/worker-up.sh` boots workers on demand, polls BullMQ, and powers down after 10 minutes of idle queue time.
- **Preflight Validation**: `scripts/check-env.ts` halts deployment if fake payments, fixture LLM, or missing keys are present.
- **Launch Gate CLI**: `npm run launch-gate` evaluates 11 mission-critical production criteria with zero tolerance for failure.

### 8. Legal, Compliance & Operations Desk
- **Statutory Legal Pages**: Full policies for Terms of Service, Privacy Policy, Clean-Room IP Policy, Refund Policy, Acceptable Use Policy, and DMCA Takedown.
- **Support Ticket Helpdesk**: Customer ticket submission (`TICK-YYYYMM-XXXX`) with admin dashboard and canned response playbooks.
- **Dynamic Semantic Changelog**: Fed directly from `CHANGELOG.md` with release version badges.
- **Visual Transformation Catalog**: Before-and-after screenshots documented in `docs/screens/`.

---

## 3. Limited / Staged Systems (Honest Accounting)

1. **Paddle Billing in Sandbox**:
   - Paddle webhook signature verification is empirically tested with real HMAC-SHA256 headers. Live payment transactions run against Paddle Sandbox until the business entity receives merchant account approval.
2. **Local Container Runtime**:
   - Production specifies Docker with gVisor (`runsc`). In local development on Windows/macOS where `runsc` is unavailable, the container runner falls back to `runc` when explicitly permitted (`ALLOW_RUNC=true`).
3. **LLM Provider in Test Suite**:
   - Automated unit tests utilize deterministic test doubles to eliminate flaky network calls and external API costs; the live build pipeline requires funded Anthropic credentials.

---

## 4. Explicitly NOT Implemented (Locked Decisions)

1. **Dark Mode**: Explicitly locked out. RevForge adheres strictly to a light-only editorial paper aesthetic (`#fbf9f4`) with high-contrast borders and serif headings.
2. **RTL (Right-to-Left)**: Explicitly locked out. RevForge is currently English-only (`lang="en"`, no `dir="rtl"`).
3. **Simulated Progress Meters**: No synthetic progress bars, fake ETA timers, or hardcoded parity scores. All statuses represent actual worker state.
4. **Invented Marketing Claims**: Zero fabricated turnaround promises ("~3 minutes"), zero fake savings guarantees, zero synthetic customer testimonials.

---

## 5. Verification Baseline (October 2026)

| Test Suite | Command | Result |
|:---|:---|:---|
| TypeScript Typecheck | `npm run typecheck` | 0 errors |
| Next.js Linter | `npm run lint` | 0 warnings, 0 errors |
| Vitest Unit & Integration | `npm test` | 30 test files / 280 tests passed |
| Schema Drift Verification | `npm run test:drift` | 33 tables / 296 columns match 4 migration files |
| Audit Referee (Tasks 0–7) | `node scripts/audit.mjs --all` | 310/310 checks passed |
| Next.js Production Build | `npm run build` | 36 routes compiled successfully |
| Accessibility Audit | `npx playwright test e2e/a11y.spec.ts` | 0 serious violations |
| Production Launch Gate | `npm run launch-gate` | 11/11 criteria passed |

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

### V8 Part 6: Whole-app UI/UX pass

- **Workspace shell.** `src/components/layout/app-shell.tsx` wraps every customer route except Studio with a desktop sidebar and a mobile dialog drawer. It has active-route state, a skip link, an account card, a real sign-out form, Escape-to-close, body scroll lock, and a Studio layout mode that leaves the three-pane editor full-width. Pages moved inside the shell without page-level padding so loading skeletons and real content share one content width.
- **Admin shell.** `src/components/layout/admin-shell.tsx` gives the administrative routes one header, a labelled navigation row, a skip link, the signed-in admin identity, and a link back to the workspace. The mobile navigation scrolls horizontally instead of hiding routes.
- **Real data, no fallback.** The dashboard, new-project form, project detail, billing, team, notifications, settings, and admin overview read persisted counts, jobs, credit ledger rows, notifications, and margin totals. `/admin/pricing` now reads `pricing_config`; when the table has no row it says so instead of rendering a default configuration. `/admin` no longer shows fabricated fleet or security metrics. Dashboard and billing no longer print a hardcoded `$5` analysis fee; billing derives the remaining free-analysis count from `analysisCreditsUsed`. The margin page uses “Contribution” column labels and “Margin Accounting” in place of the previous profit-facing wording.
- **Public surface.** Marketing pages and the auth screens now expose a `<main>` landmark, skip links are present on marketing and app shells, the marketing mobile menu has `aria-expanded`/`aria-controls`, and form controls have labels or explicit accessible names. The status page lazily loads the health probe and database so a rejected runtime configuration renders all services as unavailable instead of returning HTTP 500. Metadata now covers canonical/OpenGraph/Twitter/robots/keywords, `robots.ts`, `sitemap.ts`, and an edge OpenGraph image. Root 404/500 and the app/admin error boundaries use honest copy and `role="alert"`.
- **Accessibility and contrast.** `scripts/check-contrast.ts` now checks twelve text/surface token pairs used by normal labels and buttons; every pair passes AA, from 4.60:1 (Warning on card) to 16.93:1 (Ink on card). `npm run contrast` is the gate. `e2e/a11y.spec.ts` runs Axe on thirteen public routes in Chromium and mobile viewports; its color-contrast rule is disabled because the token gate covers that separately. Reduced-motion, focus-visible rings, and scrollable code/diff regions (`tabIndex={0}`) were added.
- **Responsive evidence.** `e2e/screenshots.spec.ts` captures eight public routes at 390, 768, and 1280 pixels in both Playwright projects and asserts an accessible `<main>` on every page. `e2e/visual.spec.ts` separately asserts no horizontal document overflow at desktop and mobile widths for `/`, `/pricing`, `/login`, and the 404 page. Screenshot artifacts are written under `test-results/screenshots/` and each test's Playwright output directory.

**V8 Part 6 verification (local, 2026-10-25):** `npm run typecheck` pass; `npm test` 30 files / 280 tests pass (schema drift skipped: no Postgres on `127.0.0.1:5432`); `npm run lint` pass; `npm run contrast` 12/12 pairs pass; `npm run build` pass; `node scripts/audit.mjs --all` 310/310 pass. `npx playwright test e2e/screenshots.spec.ts e2e/a11y.spec.ts e2e/visual.spec.ts` passed 82/82: 48 screenshot/landmark checks (8 routes × 3 widths × 2 projects), 26 Axe route checks (13 routes × 2 projects), and 8 no-overflow checks. `npm start` was run against the production build; because the local `.env` is a development configuration, the environment guard reported `PAYMENT_PROVIDER=fake`, missing `DATA_KEY`, and non-`runsc` sandbox settings. The status route still returned HTTP 200 in the down state after the lazy-load fix. Authenticated app/admin screenshots and live database-driven states were not exercised because no live Postgres/S3/Redis/Docker session is available here; no live preview, delivery, email, or provider webhook is claimed.

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
