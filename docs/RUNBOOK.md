# RevForge AI — Operational Incident & Maintenance Runbook

## 1. Monitoring Metrics & Alert Thresholds

| Metric | Target | Warning Threshold | Critical Incident Response |
| :--- | :--- | :--- | :--- |
| **Triage Latency (P95)** | < 3,000ms | > 5,000ms | Inspect upstream DNS latency & SSRF resolver cache. |
| **Paddle Webhook Signature Failures** | 0% | > 1 failure / hr | Check secret key rotation; inspect for clock drift. |
| **Sandbox Memory Usage** | < 60% quota | > 80% quota | Auto-scale worker pool; enforce 2GB memory ceiling. |
| **Gross Margin Deviation** | 90.0% | < 88.0% | Recalibrate LLM inference token multipliers in pricing engine. |
| **Verification Test Pass Rate** | 100% | < 100% | Trigger automated refund; file triage ticket for compiler log review. |

---

## 2. Common Operational Procedures

### 2.1 Debugging Webhook Signature Verification
If Paddle transactions succeed in the payment gateway but fail to unlock the clean-room rebuild:

1. Check operational logs for `[PADDLE_SIGNATURE_ERROR]`.
2. Inspect the `Paddle-Signature` header in incoming requests:
   - Format must contain: `ts=<timestamp>;h1=<hmac_sha256>`.
   - Verify server time drift does not exceed 300 seconds (`Math.abs(currentTime - ts) <= 300`).
3. Manually re-verify transaction via CLI:
   ```bash
   node -e "const { verifyPaddleWebhookSignature } = require('./dist/lib/paddle/paddle-client'); ..."
   ```

### 2.2 Quarantining and Terminating Hostile Sandboxes
If a submitted binary triggers malware alerts or attempts abnormal system calls:

1. Navigate to the **Operations Console**: `https://revforge.ai/admin`.
2. Locate the offending job ID in the **Live Sandbox Fleet** table.
3. Click the red **SIGKILL** button. This sends an immediate `docker kill` signal to the gVisor container and revokes access to the `/vault/target` volume.
4. The system automatically marks the project status as `quarantined` and blacklists the submitter IP address.

### 2.3 Handling Failed Clean-Room Test Verification
RevForge enforces a 100% compile and test guarantee. If a synthesized codebase fails compilation in Stage 7:

1. The reconstruction worker marks the job as `failed` with compiler error traces.
2. The webhook service automatically dispatches a refund call to the Paddle API:
   ```json
   POST https://api.paddle.com/transactions/{transaction_id}/refund
   { "reason": "Failed clean-room automated compilation guarantee" }
   ```
3. An email notification with the failure diagnostic report is dispatched to the client.

### 2.4 Routine 24-Hour Artifact Scrubbing Audit
To verify compliance with the Zero-Retention Data Policy:

```bash
# Verify all temporary vault artifacts older than 24 hours are removed
find /vault/storage/ephemeral -type f -mtime +1 -exec rm -f {} +
```
