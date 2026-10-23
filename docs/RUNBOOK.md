# RevForge AI — Operations & On-Call Playbook

This runbook specifies exact operational procedures and terminal commands for primary on-call engineers managing the RevForge platform.

---

## 1. On-Call Incident Playbooks

### Playbook 1: Stuck Builds (Worker Crash / Heartbeat Expired)
**Symptoms**: Job remains in `building` or `verifying` status with no heartbeat updates for $>10$ minutes.
**Triage & Resolution**:
1. Inspect the stuck jobs and worker fleet:
   ```bash
   npx tsx -e "import { reapStuckJobs } from './src/lib/worker/reaper'; reapStuckJobs().then(console.log);"
   ```
2. Manually query the stuck job state:
   ```bash
   psql "$SYSTEM_DATABASE_URL" -c "SELECT id, status, stage, attempt, heartbeat_at, updated_at FROM build_jobs WHERE status IN ('building', 'verifying');"
   ```
3. To manually retry a stuck job:
   ```bash
   curl -X POST http://localhost:3000/api/admin/jobs/<JOB_ID> \
     -H "Content-Type: application/json" \
     -H "Cookie: <ADMIN_SESSION_COOKIE>" \
     -d '{"action": "retry"}'
   ```
4. If a job is poisoned and cannot compile, cancel and refund:
   ```bash
   curl -X POST http://localhost:3000/api/admin/jobs/<JOB_ID> \
     -H "Content-Type: application/json" \
     -H "Cookie: <ADMIN_SESSION_COOKIE>" \
     -d '{"action": "refund"}'
   ```

---

### Playbook 2: Payment Mismatch (Paddle Webhook Amount vs Order)
**Symptoms**: `[PADDLE_AMOUNT_MISMATCH]` logged; order remains in `quote_accepted` instead of `paid`.
**Triage & Resolution**:
1. Check the webhook payload recorded in `audit_log`:
   ```bash
   psql "$SYSTEM_DATABASE_URL" -c "SELECT action, metadata, created_at FROM audit_log WHERE resource_type = 'webhook' ORDER BY created_at DESC LIMIT 5;"
   ```
2. Compare expected order price with Paddle event total:
   ```bash
   psql "$SYSTEM_DATABASE_URL" -c "SELECT id, amount_cents, status FROM orders WHERE id = '<ORDER_ID>';"
   ```
3. If valid discrepancy (e.g. promo discount applied on Paddle checkout), reconcile order:
   ```bash
   psql "$SYSTEM_DATABASE_URL" -c "UPDATE orders SET status = 'paid', updated_at = NOW() WHERE id = '<ORDER_ID>';"
   ```
4. Enqueue build job if reconciled:
   ```bash
   npx tsx -e "import { buildQueue } from './src/lib/queue/queues'; buildQueue.add('reconciled-build', { jobId: '<JOB_ID>', projectId: '<PROJECT_ID>' });"
   ```

---

### Playbook 3: Upstream Provider Outage (Anthropic 429 / 5xx)
**Symptoms**: `CircuitBreakerOpenError` or frequent `429 Too Many Requests` in worker logs.
**Triage & Resolution**:
1. Check the circuit breaker state:
   ```bash
   npx tsx -e "import { globalAnthropicBreaker } from './src/lib/llm/resilience'; console.log('State:', globalAnthropicBreaker.getState());"
   ```
2. Pause active queue ingestion to prevent job starvation:
   ```bash
   npx tsx -e "import { buildQueue } from './src/lib/queue/queues'; buildQueue.pause().then(() => console.log('Queue paused.'));"
   ```
3. Verify upstream Anthropic status at `https://status.anthropic.com`.
4. Once upstream is restored, resume the build queue:
   ```bash
   npx tsx -e "import { buildQueue } from './src/lib/queue/queues'; buildQueue.resume().then(() => console.log('Queue resumed.'));"
   ```

---

### Playbook 4: Abuse & Malicious Submission Reports
**Symptoms**: Target URL flagged by phishing scanners or malware signature detected in extracted archive.
**Triage & Resolution**:
1. Quarantine the project immediately:
   ```bash
   psql "$SYSTEM_DATABASE_URL" -c "UPDATE projects SET status = 'quarantined', updated_at = NOW() WHERE id = '<PROJECT_ID>';"
   ```
2. Terminate running sandbox or preview containers:
   ```bash
   docker ps --filter "label=revforge.preview" --format "{{.ID}} {{.Names}}"
   docker rm -f <CONTAINER_ID>
   ```
3. Log the incident in the audit ledger:
   ```bash
   psql "$SYSTEM_DATABASE_URL" -c "INSERT INTO audit_log (actor_type, action, resource_type, resource_id, metadata) VALUES ('admin', 'quarantine_malware', 'project', '<PROJECT_ID>', '{\"reason\": \"abuse_report\"}');"
   ```

---

### Playbook 5: DMCA Takedown Notice Handling
**Symptoms**: Formal DMCA copyright notice received under 17 U.S.C. § 512.
**Triage & Resolution**:
1. Lookup project and associated deliverables:
   ```bash
   psql "$SYSTEM_DATABASE_URL" -c "SELECT p.id, p.name, d.storage_key_zip FROM projects p LEFT JOIN deliveries d ON d.project_id = p.id WHERE p.id = '<PROJECT_ID>';"
   ```
2. Block public access and disable download gate:
   ```bash
   psql "$SYSTEM_DATABASE_URL" -c "UPDATE projects SET status = 'quarantined', updated_at = NOW() WHERE id = '<PROJECT_ID>';"
   ```
3. Archive or delete S3 delivery artifacts:
   ```bash
   aws s3 rm "s3://$STORAGE_BUCKET_DELIVERIES/<STORAGE_KEY_ZIP>"
   ```
4. Notify user via email with counter-notice procedure:
   ```bash
   npx tsx -e "import { emailQueue } from './src/lib/queue/queues'; emailQueue.add('dmca-notice', { to: '<USER_EMAIL>', subject: 'Notice of DMCA Takedown', html: '<p>A formal DMCA takedown notice was received...</p>' });"
   ```

---

### Playbook 6: Refund Request Execution
**Symptoms**: Client requests full or partial refund under the Quality Guarantee policy.
**Triage & Resolution**:
1. Inspect build parity report and measured dimensions:
   ```bash
   psql "$SYSTEM_DATABASE_URL" -c "SELECT id, parity_score, stage, error FROM build_jobs WHERE project_id = '<PROJECT_ID>';"
   ```
2. Issue platform credits immediately:
   ```bash
   npx tsx -e "import { issueCredits } from './src/lib/billing/credits'; issueCredits({ workspaceId: '<WORKSPACE_ID>', amountCents: <AMOUNT_CENTS>, reason: 'Client satisfaction guarantee refund' }).then(console.log);"
   ```
3. If cash refund via Paddle is authorized by leadership:
   ```bash
   curl -X POST "https://api.paddle.com/transactions/<TXN_ID>/refunds" \
     -H "Authorization: Bearer $PADDLE_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"reason": "Quality guarantee refund", "type": "full"}'
   ```

---

### Playbook 7: Worker Fleet Rotation & Zero-Downtime Deployment
**Symptoms**: New worker image release or OS kernel update required.
**Triage & Resolution**:
1. Send `SIGTERM` to the running worker daemon. BullMQ automatically stops accepting new jobs and finishes existing iterations:
   ```bash
   pkill -SIGTERM -f "workers/index.ts"
   ```
2. Monitor active worker drain:
   ```bash
   psql "$SYSTEM_DATABASE_URL" -c "SELECT id, last_seen, capacity FROM worker_heartbeats;"
   ```
3. Launch replacement worker on new revision:
   ```bash
   WORKER_ID="worker-$(hostname)-$(date +%s)" npx tsx workers/index.ts &
   ```
4. Verify replacement heartbeat registered within 15 seconds:
   ```bash
   curl -s http://localhost:3000/api/health | jq .services.worker
   ```

---

### Playbook 8: Production Secret Rotation (Paddle / S3 / NextAuth)
**Symptoms**: Scheduled 90-day secret rotation or credential leak containment.
**Triage & Resolution**:
1. Generate new secret key:
   ```bash
   openssl rand -hex 32
   ```
2. Update deployment environment variables in secret store (`.env` or AWS SSM).
3. For Paddle Webhook Secret: configure secondary webhook in Paddle dashboard before revoking old key to ensure zero lost transactions.
4. Restart web and worker containers sequentially:
   ```bash
   docker compose restart web
   docker compose restart worker
   ```
5. Execute smoke test to verify new signatures validate:
   ```bash
   npm run test
   ```
