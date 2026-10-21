# RevForge AI — API Reference Documentation

This document specifies the HTTP endpoints, server actions, authentication requirements, and error codes for the RevForge AI platform.

---

## 1. Authentication & Security Headers

All authenticated endpoints require a valid session cookie established via NextAuth (`authjs.session-token`).
Cross-origin state-mutating requests (`POST`, `PUT`, `DELETE`) require standard security headers (`X-CSRF-Token` or Next.js action headers) and same-origin validation.

---

## 2. Real-Time Project Event Stream (SSE)

### `GET /api/projects/:id/events`

Establishes a Server-Sent Events (SSE) stream delivering real-time telemetry from analysis and build worker pipelines.

- **Authentication**: Required (User must belong to the workspace that owns the project).
- **Headers**:
  - `Accept: text/event-stream`
- **Responses**:
  - `200 OK`: Active streaming connection.
    ```
    event: heartbeat
    data: {"timestamp": 1729471200000}

    event: progress
    data: {"step": "synthesizing_components", "iteration": 2, "parity": 0.84, "cost": 4.12}

    event: completed
    data: {"status": "delivered", "downloadUrl": "/api/download/proj_123"}
    ```
  - `401 Unauthorized`: Missing or invalid session.
  - `403 Forbidden`: Cross-tenant IDOR attempt.
  - `404 Not Found`: Project ID does not exist.

---

## 3. Artifact Delivery & Download Gateway

### `GET /api/download/:projectId`

Generates and redirects to a cryptographically signed, short-lived S3 download URL (5-minute expiry) for the project delivery package.

- **Authentication**: Required.
- **Access Controls**:
  1. The project must have reached terminal state `delivered` or `delivered_partial`.
  2. The associated order must have payment status `paid` (or paid by credits).
  3. The requesting user must have ownership permissions in the target workspace.
- **Responses**:
  - `302 Found`: Redirects to temporary presigned S3/MinIO bucket URL.
  - `402 Payment Required`: Order is unpaid or awaiting checkout.
  - `403 Forbidden`: Tenant mismatch or unauthorized user.
  - `404 Not Found`: Delivery package not found on storage backend.

---

## 4. Webhook Processing

### `POST /api/webhooks/paddle`

Processes asynchronous transactional event notifications from Paddle Billing.

- **Authentication**: Verified via HMAC-SHA256 signature in the `Paddle-Signature` header.
- **Signature Format**: `ts=<unix_timestamp>;h1=<hex_hmac>`
- **Security Protections**:
  - Replay attack mitigation: Rejects any event with timestamp skew > ±300 seconds.
  - Fail-closed: Missing secret or signature immediately yields `400 Bad Request`.
  - Idempotency: Events are checked against `processed_webhook_events`. Duplicates return `200 OK` without re-executing transitions.
- **Handled Events**:
  - `transaction.completed`: Verifies amount matches database quote, transitions project from `awaiting_payment` to `paid`, writes to transactional outbox.
  - `transaction.payment_failed`: Marks order as failed.
- **Responses**:
  - `200 OK`: `{"status": "received"}` or `{"status": "ignored"}`
  - `400 Bad Request`: `{"error": "invalid_signature"}`

---

## 5. System Health & Readiness

### `GET /api/health`
Returns infrastructure liveness status.
- **Response**: `200 OK`
  ```json
  {
    "status": "healthy",
    "uptime": 34812,
    "timestamp": 1729471200000
  }
  ```

### `GET /api/ready`
Verifies PostgreSQL connection and Redis connectivity.
- **Response**: `200 OK`
  ```json
  {
    "status": "ready",
    "database": "connected",
    "redis": "connected"
  }
  ```
