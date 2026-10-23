# RevForge Pricing Architecture & Unit Economics Calibration

This document outlines the pricing model, provider cost structure, margin requirements, and unit economics calibration for RevForge, grounded in empirical data from `docs/QUALITY.md`.

---

## 1. Unit Economics Philosophy

RevForge operates on a strict **cost-plus margin and risk-capped** financial framework:
1. Every job quoted must guarantee a minimum target gross margin ($\ge 50\%$).
2. Hard spend limits prevent runaway model costs on difficult builds.
3. Post-delivery Studio edits carry a token markup that covers model inference, container preview compute, and platform overhead.
4. Automatic platform credit refunds are issued if a job fails our internal quality gates through no fault of the client.

---

## 2. Empirical Benchmark Calibration

From the benchmark run across 12 reference targets (`benchmarks/targets/`):
- **Average Provider Cost per Target**: $0.36
- **Highest Provider Cost (E-Commerce Storefront)**: $0.76 (3 build iterations)
- **Lowest Provider Cost (Static Landing Page)**: $0.13 (2 build iterations)
- **Average Iteration Count**: 2.25 iterations

### A. Per-Tier Hours Rubric in Analyst Prompt
The analyst prompt uses estimated engineer-hours as a proxy for client market value. Based on benchmark complexity:
- **Simple Landing Page (`landing`)**: 2 to 4 hours (\$60 - \$120 baseline)
- **Multi-page Marketing Site (`multi-page`)**: 4 to 8 hours (\$120 - \$240 baseline)
- **Content / Blog CMS (`content`)**: 5 to 10 hours (\$150 - \$300 baseline)
- **SPA Dashboard (`dashboard`)**: 8 to 16 hours (\$240 - \$480 baseline)
- **Auth & CRUD Application (`crud`)**: 8 to 16 hours (\$240 - \$480 baseline)
- **E-Commerce Storefront (`ecommerce`)**: 12 to 24 hours (\$360 - \$720 baseline)
- **Desktop Application (`desktop`)**: 12 to 24 hours (\$360 - \$720 baseline)
- **Mobile Application / APK (`mobile`)**: 10 to 20 hours (\$300 - \$600 baseline)

### B. Cost Cap Ratio (`COST_CAP_RATIO = 0.35`)
To ensure that RevForge never incurs a loss on a job, total LLM provider costs + compute costs are capped at **35% of the gross order value**.
If a build approaches 35% of order revenue without reaching quality thresholds:
- The build orchestrator pauses iteration.
- If parity $\ge 80\%$, the build ships as `delivered_partial` with an itemized explanation of unverified features.
- If parity $< 80\%$, the job halts and issues an automatic credit refund.

### C. Studio Markup (`STUDIO_MARKUP = 2.5x` / 150% markup)
Studio post-delivery edits consume LLM tokens and live Docker preview container time.
- Base Anthropic token costs are multiplied by 2.5x to calculate token credit deduction.
- Minimum floor: 50 cents (50 credits) per edit.
- This ensures an effective gross margin of $\ge 60\%$ on all Studio operations after accounting for container runtime and ingress proxy costs.

### D. Minimum Build Margin (`MIN_BUILD_MARGIN_PCT = 50%`)
The quote engine calculates estimated build costs using recent historical averages for the classified tier.
- If the estimated provider cost exceeds 50% of the calculated price, the quote engine adjusts the base quote upward or refuses the build.
- This protects the business against adverse selection on unusually complex codebases.

### E. Iteration Limits
- **Fast / Small tiers (Landing, PWA, Docs)**: Maximum 2 to 3 iterations.
- **Medium tiers (Multi-page, Blog, CRUD)**: Maximum 3 to 4 iterations.
- **Complex tiers (Dashboard, E-Commerce, Desktop, Mobile)**: Maximum 5 iterations.

### F. Dynamic Model Routing
- **Scaffolding & File Setup**: `FAST` model (Claude 3.5 Haiku) for generating initial folder structure, static configs, and trivial boilerplate.
- **Standard Implementation**: `STANDARD` model (Claude 3.5 Sonnet / 3.7 Sonnet) for core reverse engineering, schema design, and component writing.
- **Stagnation Recovery**: `PREMIUM` model (Claude 3 Opus) invoked only when consecutive iterations fail to improve parity by $\ge 0.05$.
