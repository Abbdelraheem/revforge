# Project Progress & Acceptance Ledger

## Master Task Acceptance Status (`scripts/audit.mjs`)

| Task | Status | Evidence (audit output tail) | Date |
|---|---|---|---|
| Task 0 — Foundation & Environment | done | `node scripts/audit.mjs --task 0`<br><pre>T0: 32/32&#10;commit=685cf18&#10;ALL SELECTED CHECKS PASSED</pre> | 2026-10-20 |
| Task 1 — Purge Legacy, Real Auth & Honest Copy | done | `node scripts/audit.mjs --task 1`<br><pre>T1: 29/29&#10;commit=685cf18&#10;ALL SELECTED CHECKS PASSED</pre> | 2026-10-20 |
| Task 2 — Real Data Flow (Wizard → Analysis → Quote → Checkout → Webhook → Queue) | done | `node scripts/audit.mjs --task 2`<br><pre>T2: 33/33&#10;commit=685cf18&#10;ALL SELECTED CHECKS PASSED</pre> | 2026-10-20 |
| Task 3 — Sandbox, Egress Proxy, Extractors | todo | Pending task run | 2026-10-20 |
| Task 4 — Build Engine | todo | Pending task run | 2026-10-20 |
| Task 5 — UI / Design Tokens | todo | Pending task run | 2026-10-20 |
| Task 6 — Tests & Property Suites | todo | Pending task run | 2026-10-20 |
| Task 7 — Docs & Honesty Audit | todo | Pending task run | 2026-10-20 |

---

## Detailed Task 2 Exit Summary

- **BullMQ Queues & Transactional Outbox**:
  - `src/lib/queue/queues.ts`: `analysisQueue`, `buildQueue`, `emailQueue` configured on Redis.
  - `src/lib/queue/outbox.ts`: `dispatchOutbox` processes pending events, dispatches to BullMQ with unique job IDs.
  - `workers/index.ts`: Worker daemon updating `workerHeartbeats` table and dispatching outbox on interval.
  - `workers/analysis-worker.ts`: BullMQ Worker executing `analysisPipeline(projectId)`.
- **Analysis Pipeline**:
  - `src/lib/analysis/pipeline.ts`: Integrates `runExtractor`, `callStructured`, and `persistAnalysisReport` with graceful degradation fallback to `unknown_server_side` on extractor failure.
  - `src/lib/analysis/free-trial.ts`: Atomic update `analysisCreditsUsed < 1` enforcing 1 complimentary analysis per user.
- **Quotes & Checkout Flow**:
  - `src/server/actions/quotes.ts`: Server action recalculating line items and totals with `priceQuote` from `@/lib/pricing/engine.ts`.
  - `src/server/actions/checkout.ts`: Zero client price tampering (amount comes strictly from DB quote), handles 100% platform credit checkout (`paid_by_credit`), integrates `createCheckout` and `transitionProject`.
  - `src/app/api/webhooks/paddle/route.ts`: Verified fail-closed, ±300s replay window, currency/amount matching, idempotency on conflict, outbox dispatch.
  - `src/app/dev/fake-checkout/page.tsx`: Dev-only checkout simulator posting signed HMAC webhooks wrapped in `<Suspense>`.
- **Projects Pages**:
  - `src/app/(app)/projects/page.tsx`: Server Component listing workspace projects from DB.
  - `src/app/(app)/projects/[id]/page.tsx`: Server Component rendering project details, evidence, quote lines, build status, and checkout action.
- **Production Build**:
  - `next build` compiled 29/29 routes cleanly with zero TypeScript errors.
