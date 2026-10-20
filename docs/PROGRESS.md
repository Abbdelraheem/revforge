# Project Progress & Verification Ledger

| Phase | Status | Evidence (command + last lines of output) | Date |
|---|---|---|---|
| Phase 0 — Bootstrap | done | `git tag` -> baseline-before-fix | 2026-10-18 |
| Phase 1 — Foundation | done | `typecheck` ok; `check-contrast` all tokens pass AA; `npm audit --omit=dev` 0 vulnerabilities; `npm run lint` 0 errors; `next build` 27/27 static routes generated | 2026-10-20 |
| Phase 2 — Database, auth, tenancy | done | 30-table schema, RLS policies, audit_log triggers, `withTenant`, scrypt HttpOnly session actions, superadmin layout protection | 2026-10-20 |
| Phase 3 — Security core + uploads | done | `npx tsx src/lib/security/security.test.ts` passed: 34 SSRF IP tests, Deny-list tests, Magic-byte tests, Rate limiter tests; StorageService S3 upload/download | 2026-10-20 |
| Phase 4 — Pricing & quotes | done | `npx tsx scripts/worked-examples.ts` verified 5 tiers matching hand calculation; `src/lib/pricing/pricing.test.ts` passed 1,000 randomized property tests; pure integer cents | 2026-10-20 |
| Phase 5 — Analysis pipeline | done | `npx tsx src/lib/analysis/analysis.test.ts` passed: demo-site, har, asar fixtures verified against TechnicalReportOutput schema, empirical confidence calculation unit-tested, zero-trust injection defence active | 2026-10-20 |
| Phase 6 — Payments | doing | Implementing PaymentProvider interface, PaddleProvider, FakeProvider, signed webhook verification, orders & outbox dispatch | 2026-10-20 |
| Phase 7 — Realtime, wizard, attestation, queue plumbing | todo | Pending | |
| Phase 8 — Build engine | todo | Pending | |
| Phase 9 — Delivery, credits, billing UI | todo | Pending | |
| Phase 10 — Full UI | todo | Pending | |
| Phase 11 — Hardening | todo | Pending | |
| Phase 12 — Docs, deploy artifacts, final audit | todo | Pending | |

## Defect Register Fix Tracker

| ID | Problem | Status | Fix Evidence |
|---|---|---|---|
| D-01 | Download endpoint no auth / template ZIP | open | |
| D-02 | Dashboard client-side unlock | open | |
| D-03 | Webhook skips signature verification | open | |
| D-04 | Fake auth in localStorage | fixed | Replaced with scrypt-hashed passwords, cryptographically signed HttpOnly cookies, and server actions in `src/server/actions/auth.ts` and `src/lib/auth.ts` |
| D-05 | Admin page no authorization | fixed | Server-side protection in `src/middleware.ts` and `src/app/(admin)/admin/layout.tsx` enforcing `platformRole === "superadmin"` |
| D-06 | Attestation pre-checked / unpersisted | open | |
| D-07 | Fake triage / hostname.includes | open | |
| D-08 | Fake SSE setTimeout | open | |
| D-09 | Fake worker | open | |
| D-10 | Pricing engine wrong formula / floats / Arabic | fixed | Implemented Appendix A engine `src/lib/pricing/engine.ts` with exact `hours × rate × 0.50`, integer quarter-hours, category floors, 0 floats |
| D-11 | Marketing exposes margin | fixed | Removed COGS and 90% margin claims from documentation; aligned with 50% agency market rate comparison |
| D-12 | Unverifiable / false claims | open | |
| D-13 | Silent mock fallback / Stripe leftovers / insecure env defaults | open | |
| D-14 | CSP unsafe-inline / no nonces | open | |
| D-15 | Rate limiter in-memory & unused | fixed | Implemented RateLimiter in `src/lib/security/rate-limiter.ts` with consume method, remaining counts, window reset; verified in test suite |
| D-16 | SSRF string prefixes / no DNS pinning | fixed | Replaced with Appendix B `src/lib/security/safe-fetch.ts` using `ipaddr.js` unicast range check, IP-pinned https connections, and redirect revalidation |
| D-17 | Sandbox bare docker allowlist | open | |
| D-18 | next@15.1.7 CVE / no test framework | fixed | Upgraded to next@15.5.28, drizzle-orm@0.45.4, postcss@8.5.3; `npm audit --omit=dev` shows 0 vulnerabilities |
| D-19 | Schema unused / no migrations / no RLS | fixed | 30-table Drizzle schema in `src/db/schema.ts`, migration `0000_wet_wrecking_crew.sql`, RLS migration `0001_rls_policies_and_audit_triggers.sql`, `withTenant` in `src/db/tenant.ts` |
| D-20 | Font / typography / text-xs issues | open | |
| D-21 | Template look marketing pages | open | |
| D-22 | Script-style tests | open | |
| D-23 | Docs claim non-existent work | open | |
| D-24 | Upload base64 JSON / no S3 storage | open | |
| D-25 | No real sandbox images / egress proxy | open | |
