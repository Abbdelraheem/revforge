# Architectural & Technical Decisions Log
# Append-only. One line per decision.

- 2026-10-18: Project initialized under MASTER BUILD PROMPT with locked decisions from Section 1.
- 2026-10-18: Brand default established as RevForge; central configuration in src/config/brand.ts.
- 2026-10-18: Pricing model strictly integer cents using hours * rate * 0.5 with category floors.
- 2026-10-18: English only, Light theme only (warm paper technical editorial aesthetic).
- 2026-10-20: Task 1: Purged 10 legacy files/folders, migrated dashboard to DB-reading server component, removed all localStorage/fake personas/COGS talk/false guarantees/misused statute claims, added verify-email/forgot-password/reset-password pages.
- 2026-10-20: Task 2: Wired end-to-end data flow (queues, outbox dispatcher, analysis worker, pipeline with structured LLM and graceful degradation, DB-driven checkout with zero client price tampering, free-trial atomic entitlement, projects UI, dev fake checkout).
- 2026-10-20: Task 3: Implemented sandboxing primitives (profiles with gVisor/runsc, Zod-validated args, teardown labels, shell:false runner), egress proxy (host allowlist, DNS IP pinning, blocked IP protection), and extractors (playwright web crawler with 375px mobile viewport, HAR parser, APK manifest extractor, Electron ASAR unpacker, native binary extractor).
- 2026-10-20: Task 4: Implemented autonomous clean-room build engine (orchestrator with FAST/STANDARD/PREMIUM escalation, stagnation & time/cost bounds, minhash 0.25 leakage check, safety scan for postinstall scripts/secrets, pixelmatch/ssim parity, builder agent with chrooted tool-use loop, packager with PARITY_REPORT/EVIDENCE_LEDGER, reaper with retry/fail, and outbox reconciliation). Removed zip-builder.ts and wired download gate to signed storage URLs.
