# Changelog

All notable changes to the RevForge AI platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-10-24

### Added
- **Validation Harness & Empirical Benchmarks**:
  - 12 comprehensive reference targets under `benchmarks/targets/` spanning landing pages, SPAs, CMS blogs, e-commerce, and mobile APKs.
  - Automated benchmark harness (`npm run bench`) verifying clean-room synthesis, parity evaluation, and Studio edit pass rates.
- **Reliability & Data Safety**:
  - Resumable jobs with `WorkspaceCheckpointManager` supporting rollback and mid-build crash recovery.
  - LLM resilience layer with exponential backoff, full jitter, and circuit breaker for 429/5xx provider outages.
  - Automated dead-letter queue (DLQ) operations and stuck-job reaper issuing automatic platform refunds.
- **Observability & Operations**:
  - Structured Pino JSON logging with credential/token redaction across web and worker pipelines.
  - Prometheus metrics endpoint (`/api/metrics`) and production Grafana dashboard.
  - On-call operational runbook (`docs/RUNBOOK.md`) covering 8 critical incident playbooks.
- **Security Hardening**:
  - STRIDE threat model mapping across 8 core system components (`docs/THREAT_MODEL.md`).
  - Automated sandbox containment self-tests (`scripts/sandbox-selftest.ts`) verifying network egress blocking and read-only rootfs.
  - Strict Content-Security-Policy (CSP) with nonces and HSTS preloading.
- **Compliance & Trust**:
  - Category deny-list blocking high-risk targets (financial, defense, malware, DRM, piracy) with explicit legal citations.
  - Cryptographic ownership attestation engine requiring verified legal proof for enterprise orders.
  - Self-service GDPR/CCPA data export (`/api/user/export`) and right-to-be-forgotten deletion (`/api/user/delete`).

## [1.0.0] - 2026-10-21

### Added
- **Core Platform Architecture**:
  - Full-stack Next.js App Router frontend with warm paper aesthetic and ink typography.
  - Multi-tenant PostgreSQL database with Drizzle ORM and Row-Level Security (RLS).
  - NextAuth session-based authentication with bcrypt password hashing and CSRF protections.
- **Deep Target Ingestion**:
  - Playwright web crawler supporting dual viewports (1280px desktop, 375px mobile).
  - Support for decompiling `.har` network archives, Android `.apk` bundles, Electron `.asar` archives, and PE/ELF/Mach-O binaries.
  - Zero-trust delimiter wrapping neutralizing prompt injection attacks.
- **Clean-Room Build Engine**:
  - Multi-turn builder agent with Claude 3.5 Haiku, Claude 3.5 Sonnet, and Claude 3.7 Sonnet model escalation.
  - MinHash k-shingle scanner preventing verbatim proprietary code leakage (< 0.25 threshold).
  - Pixelmatch visual comparison and composite parity evaluation (0.35 visual, 0.15 structural, 0.35 behavioral, 0.15 build health).
- **Billing & Delivery**:
  - Paddle Billing integration with HMAC-SHA256 signature verification and ±300s replay prevention.
  - Dynamic line item customization and pricing engine based on `hours × market rate × 0.5`.
  - Secure S3 presigned upload URLs and short-lived delivery ZIP download gateway with payment checks.
- **Worker Infrastructure**:
  - BullMQ queue processing (`analysisQueue`, `buildQueue`, `emailQueue`) backed by Redis.
  - Worker heartbeat tracking and automated zombie reaper process.
  - Transactional outbox pattern ensuring resilient event delivery.
- **Testing & Verification**:
  - Over 200 Vitest unit and property tests.
  - Playwright end-to-end test suites covering a11y, adversarial injection, SSRF, IDOR, and golden path.
  - Comprehensive automated audit runner (`scripts/audit.mjs`).
