# RevForge AI — Production Deployment Architecture & Runbook

This document defines the production topology, operational cost models, staging verification workflows, feature flags, and rollback procedures for RevForge AI.

---

## 1. Production Topology

```
                         [ Cloudflare Edge / WAF ]
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
         [ Web Nodes (VPS/Host) ]          [ Storage (S3 / R2) ]
          Port 3000 (Next.js 15)            Vault / Deliveries
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
  [ PostgreSQL 16 ]     [ Redis 7 / BullMQ ]
    (Forward Migrations)  (Queue Broker)
                               ▲
                               │ Outbound Egress Tunnel
                               │ (No ingress ports open)
                    [ Worker Fleet (On-Demand) ]
                    Hourly machines (Hetzner / EC2)
                    Docker sandboxes + gVisor runsc
```

### Component Details
1. **Web App (Host / VPS)**:
   - Dedicated Linux host or VPS (e.g. Hetzner CPX31: 4 vCPU, 8 GB RAM) running Next.js 15 standalone server in non-root Docker (`docker/Dockerfile.web`).
   - Handles marketing pages, authenticated customer portal, Studio UI, and webhook ingestion.
   - Cost: **~$15 – $30 / month**.

2. **Database & Cache**:
   - Managed PostgreSQL 16 with Row-Level Security (RLS) and SSL. Cost: **~$20 – $40 / month**.
   - Redis 7 for BullMQ queues and rate-limiting. Cost: **~$10 – $15 / month**.

3. **Worker Nodes (Hourly On-Demand Machine)**:
   - Launched on-demand using `./scripts/worker-up.sh`.
   - Polls BullMQ queues over an authenticated outbound tunnel; zero public ingress ports.
   - Automatically executes graceful shutdown and terminates host after 30 minutes of continuous idle time (`WORKER_IDLE_SHUTDOWN_MIN=30`).
   - Cost: **~$0.10 – $0.25 / hour** when active; **$0** when idle.

4. **Estimated Total Fixed Infrastructure Cost**:
   - **~$50 to $85 / month** fixed overhead + per-hour active worker compute.

---

## 2. Staging Environment & Paddle Sandbox

Staging operates with identical architecture to production with the following sandboxed parameters:

| Parameter | Staging Value | Production Value |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` / `staging` | `production` |
| `PADDLE_ENVIRONMENT` | `sandbox` | `production` |
| `PADDLE_API_KEY` | `padd_sbox_...` | `padd_live_...` |
| `PAYMENT_PROVIDER` | `paddle` (sandbox) | `paddle` (strictly real) |
| `LLM_PROVIDER` | `anthropic` | `anthropic` |
| `SANDBOX_RUNTIME` | `runc` (or `runsc`) | `runsc` (gVisor required) |

### Production Promotion Checklist
- [ ] Automated validation suite passes: `npm run typecheck && npm run lint && npm test`.
- [ ] Audit referee checks passed: `node scripts/audit.mjs --all` returns `ALL SELECTED CHECKS PASSED`.
- [ ] Environment preflight passes: `npx tsx scripts/check-env.ts` exits with code 0.
- [ ] Database migration dry-run completed on a staging copy without data loss.
- [ ] Real signed Paddle sandbox webhook processed and verified with HMAC SHA-256.
- [ ] Benchmark suite passes quality thresholds: `npm run bench`.
- [ ] Container containment verified: `npx tsx scripts/sandbox-selftest.ts`.

---

## 3. Rollback Procedure

In the event of a production release defect:

### A. Web Application Rollback
```bash
# 1. Re-tag previous stable container image
docker tag revforge/web:previous revforge/web:latest

# 2. Restart web service with zero-downtime swap
docker compose -f docker-compose.prod.yml up -d --no-deps web

# 3. Verify health probe
curl -f http://localhost:3000/api/health
```

### B. Worker Fleet Rollback
```bash
# 1. Stop current worker daemon gracefully (waits for active job completion)
docker stop -t 60 revforge-worker-ondemand

# 2. Pull and start previous verified worker image
export REVFORGE_WORKER_IMAGE="revforge/worker:previous"
./scripts/worker-up.sh
```

### C. Database Forward-Only Reversal
Database migrations in RevForge are strictly forward-only:
- Never execute destructive `DROP TABLE` or `DROP COLUMN` in production without a two-phase deprecation cycle.
- To revert a column or schema alteration, apply a forward compensation migration (`drizzle/00XX_revert_*.sql`).

---

## 4. Feature Flags Configuration

Production features are toggled through the `feature_flags` table or environment overrides:

| Flag Name | Default | Scope | Description |
| :--- | :--- | :--- | :--- |
| `ENABLE_GITHUB_PUSH` | `false` | System / Project | Enables direct delivery export to client GitHub repos via OAuth. |
| `ENABLE_APK_DECOMPILE` | `true` | System | Permits Android `.apk` binary disassembly in sandbox containers. |
| `ENABLE_HAR_INGEST` | `true` | System | Ingests `.har` network recordings for single-page applications. |
| `ENABLE_STUDIO_PREVIEW`| `true` | Workspace | Launches isolated Docker live preview sessions for verified versions. |
| `AUTO_CALIBRATE` | `false` | System | Automatically adjusts tier pricing multipliers based on weekly cost events. |
| `REQUIRE_ATTESTATION` | `true` | Order | Enforces cryptographic clean-room IP ownership certification before checkout. |

---

## 5. Verification Commands

Run before declaring any deployment complete:
```bash
# Validate environment sanity
npx tsx scripts/check-env.ts

# Validate Docker Compose configuration
docker compose -f docker-compose.prod.yml config

# Verify health endpoint contract
curl -i http://localhost:3000/api/health
```
