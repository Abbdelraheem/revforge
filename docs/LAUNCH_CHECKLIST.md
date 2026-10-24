# RevForge — Production Launch Checklist & Gate Operations

This checklist defines the dual-stage verification required before opening RevForge to real payment and production traffic. The platform enforces an automated gate (`npm run launch-gate`) combined with the human-only operational tasks detailed below.

---

## 1. Automated Preflight Gate (`npm run launch-gate`)

The automated launch gate executes 11 exhaustive operational tests. All must report `[PASS]` before deployment:

1. **CI Code Quality**: `tsc --noEmit`, `next lint`, `vitest run`, schema drift check, and `node scripts/audit.mjs --all` (310/310 checks).
2. **Benchmark Quality Gates**: 12 reference targets verified in `benchmarks/targets/` with valid manifests meeting `minMedianParity >= 0.85` and `minCoverage >= 0.80`.
3. **Sandbox Self-Test**: Containment arguments enforced (`--cap-drop=ALL`, `--read-only`, `--user 10001`, `--pids-limit`, `--memory`, `--cpus`), SSRF filters blocking loopback/metadata/private subnets, and path traversal rejection.
4. **Disaster Recovery**: Verified database restore drill executed within `< 30` days (`docs/RUNBOOK.md`).
5. **Production Safety**: `src/env.ts` strictly refuses `PAYMENT_PROVIDER=fake` and `LLM_PROVIDER=fixture` in production mode.
6. **Statutory Legal Pages**: All 6 statutory pages present (`/terms`, `/privacy`, `/clean-room-ip-policy`, `/refund-policy`, `/acceptable-use`, `/dmca`).
7. **Paddle Webhook**: Cryptographic HMAC-SHA256 signature verification and timing-safe replay protection verified.
8. **Observability & Alerts**: Structured JSON logger (`logger.ts`), alert dispatcher (`alerts.ts`), and healthcheck (`/api/health`).
9. **Automated Backups**: Daily `pg_dump` cron scheduled to encrypted S3 with 30-day lifecycle retention.
10. **Admin Security**: Platform superadmin role checking and encrypted session authorization active.
11. **Error Budget Dashboards**: Operational visibility active on `/admin/funnel`, `/admin/margins`, `/admin/support`, and `/api/metrics`.

Run the automated gate at any time:
```bash
npm run launch-gate
```

---

## 2. Human-Only Launch Actions (Owner Prerequisites)

The following 5 tasks cannot be automated by software and strictly require human intervention:

### 1. Paddle Merchant Account Approval
- Submit your domain and business entity details to Paddle's merchant compliance review.
- Set webhook destination to `https://<your-domain>/api/webhooks/paddle`.
- Copy your production credentials into the secure environment:
  ```env
  PAYMENT_PROVIDER=paddle
  PADDLE_API_KEY=pdl_live_...
  PADDLE_WEBHOOK_SECRET_KEY=pdl_ntfset_...
  PADDLE_ENVIRONMENT=production
  ```

### 2. Custom Domain & DNS Configuration
- Update registrar DNS records:
  - `A` / `CNAME` pointing to web load balancer.
  - `TXT` records for SPF (`v=spf1 include:resend.com ~all`).
  - `DKIM` and `DMARC` records for verified transactional deliverability.
- Verify `APP_URL=https://<your-domain>` in `.env`.

### 3. Legal Counsel Review & IP Policy Sign-Off
- Engage a technology lawyer specializing in copyright and software reverse engineering.
- Review `docs/CLEAN_ROOM_SPEC.md`, `src/app/(marketing)/clean-room-ip-policy/page.tsx`, and Terms of Service.
- Ensure compliance with statutory decompilation exceptions (EU Directive 2009/24/EC Art. 6; US 17 U.S.C. § 1201(f)).

### 4. Production API Keys & Infrastructure Provisioning
- **Anthropic**: Provision production API key with tier-4 rate limits (`sk-ant-api03-...`) and configure `LLM_PROVIDER=anthropic`.
- **Resend**: Verify sending domain in Resend dashboard and set `RESEND_API_KEY=re_live_...`.
- **AWS KMS / S3**: Configure private S3 buckets (`revforge-archives`, `revforge-backups`) with AES-256 server-side encryption.
- **Postgres 16 & Redis**: Run `npx drizzle-kit migrate` and seed Pricing Config v1 with `npx tsx src/db/seed.ts`.

### 5. First Live Benchmark Run on Dedicated gVisor Host
- Provision the dedicated worker host with Docker and Google gVisor runtime (`runsc`) installed.
- Configure `SANDBOX_RUNTIME=runsc` and verify with `docker info | grep runsc`.
- Execute the live benchmark run on the 12 reference targets:
  ```bash
  npm run bench
  ```
- Verify live end-to-end user journeys:
  ```bash
  npm run e2e:live
  ```

