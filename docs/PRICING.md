# RevForge Pricing Architecture & Unit Economics (V10)

This document specifies the pricing structure, token unit economics, and margin requirements for RevForge, calibrated against Anthropic Opus 5.5 provider economics.

---

## 1. Unit Economics & Pricing Philosophy

RevForge operates on a disciplined **cost-plus margin floor and risk-capped** framework:
1. Every reconstruction order enforces a minimum gross margin floor of **65%** (`MIN_BUILD_MARGIN_PCT = 65`).
2. Hard spend limits prevent runaway model costs: `COST_CAP_RATIO = 0.35` (maximum 35% of order revenue may be spent on provider tokens).
3. Studio edits use a transparent token credit system: `STUDIO_MARKUP = 3.0` (1 token = 1¢ in customer value).
4. Analysis fee: $5 (credited to the build order within 7 days; first analysis free).
5. All prices are grounded in measured costs, never invented: prices are adjusted only from real empirical measurements.

---

## 2. Public Price List (Tiers & Defaults)

Public pricing replaces the agency formula (`hours × rate × 0.5`) with transparent, predictable tier defaults (editable in the admin portal):

| Tier | Public Price | Description | Norm Bounds |
|---|---|---|---|
| **Landing / Portfolio** | **$59** | Single-page landing, portfolio, or marketing site | Up to 3 routes, 1-2 forms |
| **Multi-page / Content** | **$119** | Multi-page site, documentation, dynamic blog, content portal | Up to 8 routes, dynamic layouts |
| **Web App (Auth+CRUD)** | **$299** | Interactive web application with authentication, CRUD entities, relational models | Up to 20 routes, session auth, CRUD |
| **Mobile / Desktop** | **$449** | Cross-platform desktop binary (Electron/Tauri) or mobile-optimized PWA/APK | Up to 35 routes, local state, offline |
| **Complex SaaS** | **$899** | Multi-role SaaS platform with payments, background tasks, high-concurrency flows | Up to 50 routes, multiple user roles |

### Complexity Add-ons
Add-ons are derived from the Analyst's rubric (+hours arithmetic):
- Additional custom screen beyond tier norm: +$15 - $25
- Additional CRUD entity: +$30
- Custom payment gateway or third-party integration: +$50 - $90
- Realtime / WebSocket feature: +$60

### Hard Floor Formula
To maintain profitability regardless of target complexity, every order enforces a mathematical floor:
$$\text{Price Floor} = \left\lceil \frac{\text{Projected Provider Cost}}{1 - \text{MIN\_BUILD\_MARGIN\_PCT}} \right\rceil = \left\lceil \frac{\text{Projected Provider Cost}}{0.35} \right\rceil$$

If target complexity yields a projected provider cost of $30, the hard price floor is automatically $\lceil \$30 / 0.35 \rceil = \$86$.

---

## 3. Anthropic Model Rates (Verified October 25, 2026)

Official Anthropic rates (per million tokens, USD):

| Model | Input / M | Output / M | Cache Write / M (5 min) | Cache Read / M | Batch Discount |
|---|---|---|---|---|---|
| **Claude Opus 5.5** (`PREMIUM`) | $4.00 | $20.00 | $5.00 | $0.20 | -50% |
| **Claude 3.5 Sonnet** (`STANDARD`) | $3.00 | $15.00 | $3.75 | $0.30 | -50% |
| **Claude 3.5 Haiku** (`FAST`) | $0.80 | $4.00 | $1.00 | $0.08 | -50% |

*Source: [Anthropic Published Pricing](https://www.anthropic.com/pricing), verified October 25, 2026.*

### Prompt Caching Economics
The builder and Studio edit loops utilize prompt caching (`cache_control: ephemeral`) on:
1. Static role system prompts (Analyst, Builder, Reviewer).
2. The complete technical specification (`<untrusted_spec>`).
3. The initial build plan and stable workspace file tree.

Prompt caching achieves an 85–92% reduction on repeated input token costs (cache read at $0.20/M vs $4.00/M on Opus 5.5).

---

## 4. Studio Token Packs & Allotments

- **Included Allotment**: 10% of the build order price in Studio tokens (e.g., a $299 build includes $29.90 = 2,990 tokens).
- **Token Valuation**: 1 Token = 1¢ ($0.01 USD).
- **Markup**: `STUDIO_MARKUP = 3.0` (deducts 300 tokens per $1.00 of raw provider API cost).
- **Token Credit Packs**:
  - **Starter Pack**: $10 → 1,100 tokens (10% bonus)
  - **Builder Pack**: $25 → 2,900 tokens (16% bonus)
  - **Scale Pack**: $60 → 7,200 tokens (20% bonus)

---

## 5. Empirical Live Benchmark Ledger

> [!NOTE]
> Synthetic benchmark results generated in previous development iterations have been completely removed.
> Live per-tier p50/p90 costs will be populated exclusively from real pipeline execution (`npm run bench` with `LLM_PROVIDER=live`).
