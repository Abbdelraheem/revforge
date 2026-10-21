# RevForge AI — On-Demand Worker Fleet Architecture

This document describes the design and operational lifecycle of the background worker fleet in RevForge AI.

## 1. Queue Topology

The worker subsystem is powered by Redis and BullMQ, partitioned into three isolated queues:

1. **`analysisQueue`**:
   - Handles target ingestion, crawling, binary decompilation, and preliminary LLM technical report scoping.
   - Concurrency: 4 jobs per worker node.
   - Resource Profile: 2 vCPU, 4GB RAM.

2. **`buildQueue`**:
   - Executes multi-turn iterative clean-room synthesis loops with Claude models.
   - Runs TypeScript compilation, npm audit, and Playwright verification inside gVisor containers.
   - Concurrency: 1 job per worker node to prevent CPU contention during pixelmatch rendering.
   - Resource Profile: 4-8 vCPU, 16GB RAM.

3. **`emailQueue`**:
   - Asynchronously dispatches transactional delivery notifications, receipts, and order updates via Resend.
   - Concurrency: 10 jobs per worker node.

---

## 2. Worker Lifecycle & Heartbeats

Each running worker instance periodically updates the `worker_heartbeats` table in PostgreSQL:

- Heartbeat interval: Every 15 seconds.
- Stale threshold: 60 seconds without heartbeat marks worker as dead.
- Outbox Reconciliation: An outbox poller runs every 5 seconds to claim unprocessed transactional events from `outbox_events` and schedule them onto BullMQ.

---

## 3. Reaper Process & Zombie Mitigation

In the event of an unexpected worker crash (OOM, node restart, or network partition):

- The `ReaperService` monitors active jobs with `status = 'building'` or `status = 'analyzing'`.
- If a job has been executing longer than its maximum allowed time (e.g., 2 hours for build, 15 minutes for analysis) or its assigned worker has missed 3 consecutive heartbeats:
  1. The job is marked as failed or queued for retry (up to 3 maximum retries).
  2. Sandboxed containers with label `revforge-job-id=<id>` are terminated and cleaned up via Docker API.
  3. Temporary disk volumes in `/tmp/revforge-sandboxes/<job-id>` are unmounted and wiped.

---

## 4. Container Isolation (gVisor / `runsc`)

All untrusted target analysis and synthesized code execution must run within containerized sandboxes backed by Google's gVisor runtime (`runsc`):

- **Network Isolation**: By default, sandboxes run with `--network=none` unless executing an approved package installation step.
- **Egress Proxy**: Outbound HTTP requests route through the dedicated egress proxy with strict domain allowlists and blocked IP filtering (preventing SSRF).
- **Filesystem Chroot**: Sandboxes mount an isolated tmpfs workspace with copy-on-write scratch directories. Root filesystem is mounted read-only.

---

## 5. Autoscaling On-Demand Workers

In production (e.g. AWS ECS / Kubernetes / Hetzner Cloud):

1. **HPA / KEDA Scaler**:
   - Monitor BullMQ queue depth (`bullmq.queue.waiting_count`).
   - Scale out worker pods when `waiting_count > 0`.
   - Scale in with graceful shutdown hook (`SIGTERM`) allowing active jobs to finish or yield gracefully.

2. **Cold Start & Warm Pools**:
   - Maintain a minimum of 1 warm worker pod for instant analysis turnaround (< 30 seconds).
   - Provision burst workers on-demand for long-running synthesis builds.
