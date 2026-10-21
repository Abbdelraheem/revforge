# RevForge AI — Clean-Room Application Rebuilding Platform

RevForge AI is a high-assurance platform that analyzes legacy applications, mobile binaries, web endpoints, and network traces, producing clean-room rebuild specifications and synthesizing fresh, modern TypeScript/Next.js codebases.

Every synthesis run is clean-room verified: references undergo strict shingle MinHash leakage detection (enforcing zero copyright infringement), parity verification against visual and functional baselines, and execution inside hardened gVisor sandboxes.

---

## Architecture Overview

1. **Ingestion & Deep Extraction**:
   - Web Crawler: Headless browser crawling with desktop (1280px) and mobile (375px) responsive captures.
   - Archives & Binaries: Decompiles `.har` network archives, `.apk` Android packages, Electron `.asar` bundles, and PE/ELF/Mach-O native binaries.
   - Zero-Trust Ingestion: All untrusted strings wrapped in strict XML delimiters with prompt-injection neutralization.

2. **Analysis & Deterministic Scoping**:
   - Categorizes components into frontend, backend, database, and auth boundaries.
   - Calculates itemized feature estimates and market benchmark rates.
   - Generates deterministic technical reports with structured Zod schema validation.

3. **Transparent Fair Pricing**:
   - Pricing formula: `hours × market rate × 0.5`.
   - Guaranteed minimum order floors per tier: Portfolio (\$1,000), Web App (\$3,500), Mobile App (\$4,500), Desktop (\$6,000), Enterprise SaaS (\$12,000).
   - Dynamic feature line item customization with instant recalculation.

4. **Multi-Model Clean-Room Synthesis**:
   - Escalates intelligently across Claude 3.5 Haiku, Claude 3.5 Sonnet, and Claude 3.7 Sonnet.
   - MinHash k-shingle scanner prevents verbatim code leakage (threshold < 0.25).
   - Pixelmatch and visual perceptual difference evaluation.
   - Composite parity scoring: Visual (35%), Structural (15%), Behavioral (35%), Build Health (15%).

5. **Hardened Multi-Tenant Security**:
   - PostgreSQL Row-Level Security (RLS) with tenant workspace scoping.
   - SSRF protection rejecting private IP ranges, link-local metadata (169.254.169.254), and mapped IPv6.
   - Secure signed S3 presigned URLs for large uploads and completed delivery ZIP archives.

---

## Quick Start (Local Development)

### 1. Prerequisites
- Docker & Docker Compose
- Node.js 20+ and npm

### 2. Boot Infrastructure Services
Clone the repository and spin up PostgreSQL 16, Redis 7, MinIO object storage, and Mailpit:

```bash
docker compose up -d
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Environment & Database
Copy environment variables and run database migrations with initial seed data:

```bash
cp .env.example .env
npx drizzle-kit migrate
npx tsx src/db/seed.ts
```

### 5. Launch the Web Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Launch the Background Worker Fleet
In a separate terminal session, start the queue processor and synthesis worker:

```bash
npm run worker
```

---

## Testing & Quality Assurance

RevForge AI includes extensive automated test suites ensuring zero regressions:

```bash
# Run unit & property suites (Vitest)
npm run test

# Run end-to-end integration tests (Playwright)
npm run e2e

# Run accessibility audit (axe-core WCAG verification)
npm run test:a11y

# Run full platform honesty & verification audit
node scripts/audit.mjs --all --gates
```

---

## Production Deployment

Refer to [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for detailed cloud configuration instructions on Kubernetes or Hetzner bare-metal nodes with gVisor (`runsc`) container isolation.
