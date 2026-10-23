# RevForge AI — Paddle Merchant of Record Compliance Review

This document provides a line-by-line compliance self-assessment against the **Paddle Merchant Acceptable Use Policy** and **SaaS Merchant Requirements** for RevForge.

---

## 1. Prohibited & Banned Category Verification

RevForge strictly operates as an enterprise software development platform and compiler toolchain.

| Paddle Banned Category | RevForge Assessment & Technical Guardrail | Compliance Status |
| :--- | :--- | :--- |
| **Financial Services / Crypto / Banking** | Denied via regex and host blocking in `src/lib/security/deny-list.ts`. | **COMPLIANT (BLOCKED)** |
| **Healthcare / HIPAA Protected Health Info** | Patient portals, clinic systems, and prescription databases are blocked at triage. | **COMPLIANT (BLOCKED)** |
| **Government & Military Defense** | `.gov`, `.mil`, and defense contractor domains are rejected by deny-list. | **COMPLIANT (BLOCKED)** |
| **Malware, Spyware, Phishing & RATs** | Inbound file inspection rejects trojans, botnets, and malware signatures. | **COMPLIANT (BLOCKED)** |
| **DRM Bypass, Cracking & Anti-Cheat Evasion** | Denuvo, BattlEye, and game crack reverse-engineering is strictly rejected. | **COMPLIANT (BLOCKED)** |
| **Gambling, Adult, Piracy & Warez** | Explicit content, casino games, and torrent sites are denied under Section 4. | **COMPLIANT (BLOCKED)** |

---

## 2. Transparent Pricing & Billing Disclosures

- **No Hidden Fees**: RevForge quotes are fully itemized by engineering hours and complexity tier before checkout.
- **Fixed-Price Contracts**: Builds are quoted as one-time milestone payments without unannounced recurring subscriptions.
- **Studio Token Purchases**: Studio post-delivery editing tokens are clearly denominated (e.g. 100 credits = $10.00) with explicit consumption logging.
- **Pre-Payment Clarity**: The customer reviews exact deliverables, expected routes, and boundaries before entering the Paddle checkout modal.

---

## 3. Clear & Enforceable Refund Policy

- **Published Policy URL**: `https://revforge.ai/refund-policy` (accessible in site header, footer, and checkout).
- **Automated Failure Guarantee**: If a build fails to compile or achieve the threshold parity ($\ge 80\%$) through internal engine fault, a full platform credit refund is automatically credited to the customer workspace.
- **Disputed Refund SLA**: Refund requests submitted via in-app support or email (`support@revforge.ai`) are adjudicated within 48 business hours.

---

## 4. Truth in Advertising & Marketing Integrity

- **No Fabricated Metrics**: All turnaround times, parity benchmarks, and cost estimates originate strictly from empirical execution recorded in `docs/QUALITY.md`.
- **Honest Scoping**: Server-side business logic and proprietary backend databases that cannot be observed are labeled `unknown_server_side`, never promised as complete reproductions.
- **Clean-Room Guarantee**: All generated source code is clean-room authored by LLM builder agents within isolated sandboxes, guaranteed to be $\le 30\%$ lexical similarity against target decompilation corpus.

---

## 5. Reachable Customer Support & Contact

- **Primary Support Channel**: In-app ticketing desk (`/dashboard` & `/settings`) with automated ticket ID generation.
- **Email Contact**: `support@revforge.ai` (monitored 24/7 with a 4-hour critical on-call response SLA).
- **Physical/Legal Entity**: Documented in Terms of Service and brand configuration (`src/config/brand.ts`).

---

## 6. Chargeback Defense & Dispute Resolution Procedure

When a customer initiates a transaction dispute or chargeback with Paddle:
1. RevForge automatically compiles a **Chargeback Defense Bundle** (`src/lib/billing/fraud-guard.ts`):
   - Signed Ownership Attestation (`attestations/<projectId>.json`) with legal entity details and IP address.
   - Initial technical specification report approved by customer.
   - SHA-256 signed delivery checksums (`CHECKSUMS.txt`).
   - Git repository commit logs and delivery download access logs.
2. The defense package is submitted directly into the Paddle dispute resolution portal within 3 business days.
