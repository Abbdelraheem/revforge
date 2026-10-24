# RevForge Real-World Quality & Benchmark Report

This document records the empirical performance, parity measurements, and operational bounds of the RevForge Clean-Room Reverse Engineering and Build Engine.

**Single Source of Truth**: All marketing figures, accuracy metrics, turnaround estimates, and pricing bands displayed on RevForge landing pages and dashboards must derive strictly from the measured data in this report. Unverified claims, synthetic testimonials, or simulated scores are strictly forbidden.

---

## 1. Latest Benchmark Run

- **Execution Date**: 2026-10-23
- **Git Commit**: `a97dc83`
- **Harness**: `npm run bench` (`scripts/bench.ts`)
- **Total Reference Targets**: 12
- **Median Parity**: 100.0% (Quality threshold: $\ge 85.0\%$)
- **Median Coverage**: 65.0% (offline sandboxed verification without live browser rendering)
- **Overall Studio Edit Success Rate**: 100.0% (36/36 scripted edits passed verification)
- **Max Leakage Similarity**: 2.9% (Strict ceiling: $\le 30.0\%$)
- **Total Provider Token Cost**: $4.29 (across all 12 targets, 27 build iterations)

---

## 2. Empirical Target Results Matrix

| Target ID | Tier | Final Status | Overall Parity | Visual | Structural | Behavioral | Build Health | Coverage | Iterations | Cost ($) | Wall Time (s) | Max Leakage | Studio Edits |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `01-static-landing` | landing | delivered_partial | 100.0% | null | 100.0% | 100.0% | 100.0% | 65.0% | 2 | $0.13 | 2.3s | 0.1% | 3/3 (100%) |
| `02-multipage-marketing` | multi-page | delivered_partial | 100.0% | null | 100.0% | 100.0% | 100.0% | 65.0% | 2 | $0.23 | 2.2s | 0.0% | 3/3 (100%) |
| `03-spa-dashboard` | dashboard | delivered_partial | 100.0% | null | 100.0% | 100.0% | 100.0% | 65.0% | 3 | $0.61 | 2.2s | 2.9% | 3/3 (100%) |
| `04-blog-cms` | content | delivered_partial | 100.0% | null | 100.0% | 100.0% | 100.0% | 65.0% | 2 | $0.26 | 2.1s | 0.0% | 3/3 (100%) |
| `05-ecommerce-demo` | ecommerce | delivered_partial | 100.0% | null | 100.0% | 100.0% | 100.0% | 65.0% | 3 | $0.76 | 2.2s | 0.0% | 3/3 (100%) |
| `06-auth-crud` | crud | delivered_partial | 100.0% | null | 100.0% | 100.0% | 100.0% | 65.0% | 2 | $0.38 | 2.2s | 0.0% | 3/3 (100%) |
| `07-pwa-offline` | pwa | delivered_partial | 100.0% | null | 100.0% | 100.0% | 100.0% | 65.0% | 2 | $0.21 | 2.1s | 0.0% | 3/3 (100%) |
| `08-har-capture` | har | delivered_partial | 76.9% | null | 0.0% | 100.0% | 100.0% | 65.0% | 2 | $0.31 | 2.2s | 2.5% | 3/3 (100%) |
| `09-electron-asar` | desktop | delivered_partial | 100.0% | null | 100.0% | 100.0% | 100.0% | 65.0% | 2 | $0.43 | 2.2s | 0.4% | 3/3 (100%) |
| `10-mobile-apk` | mobile | delivered_partial | 76.9% | null | 0.0% | 100.0% | 100.0% | 65.0% | 2 | $0.36 | 2.4s | 0.0% | 3/3 (100%) |
| `11-doc-portal` | documentation | delivered_partial | 100.0% | null | 100.0% | 100.0% | 100.0% | 65.0% | 2 | $0.33 | 2.5s | 0.0% | 3/3 (100%) |
| `12-portfolio-showcase` | portfolio | delivered_partial | 100.0% | null | 100.0% | 100.0% | 100.0% | 65.0% | 2 | $0.28 | 2.6s | 0.0% | 3/3 (100%) |

---

## 3. Parity Formula & Dimension Weighting

RevForge measures parity across four independent dimensions:

1. **Build Health ($w = 0.40$)**: Workspace cleanly compiles with `npm run build` or native compiler without warnings or fatal exits.
2. **Structural Routes ($w = 0.25$)**: All expected public routes exist as real pages or endpoints returning HTTP 200.
3. **Behavioral Checks ($w = 0.20$)**: Feature specifications (forms, state updates, API stubs) pass functional assertion suites.
4. **Visual Similarity ($w = 0.15$)**: Playwright browser viewport screenshot comparison against reference captures at 1280px and 390px via `pixelmatch`.

When a dimension cannot be evaluated (e.g. visual screenshots in headless offline sandboxes), its score is recorded as `null`, and the overall parity score is computed by renormalizing weights over measured dimensions:

$$\text{Coverage} = \sum_{d \in \text{measured}} w_d$$

$$\text{Overall Parity} = \frac{\sum_{d \in \text{measured}} w_d \cdot s_d}{\text{Coverage}}$$

Delivery with full `delivered` status requires $\text{Coverage} \ge 80\%$. Lower coverage caps delivery status at `delivered_partial`.

---

## 4. Known Weaknesses and Architectural Limits

1. **Mobile APK & Desktop ASAR Decomposition**:
   Bytecode decompilation relies on static analysis of manifests (`AndroidManifest.xml`, `package.json`, assets) and network traffic. Complex native C++ binaries or obfuscated DEX classes cannot be completely reverse engineered without manual disassembly.

2. **Visual Parity in Offline/Headless Environments**:
   When Playwright or Docker runtime is unavailable in isolated worker environments, visual pixel comparison returns `null`. This prevents visual regressions from being detected until live preview verification runs.

3. **Complex Server-Side State Hydration**:
   Dynamic server-side database logic that is never exposed to the client or network payloads cannot be observed. Such features are recorded as `unknown_server_side` in the technical report and stubbed with in-memory persistence.

4. **Long-Running Build Iteration Bounds**:
   Build iterations are hard-capped at 3 to 5 iterations per job to avoid runaway LLM spend. Projects requiring deeper iterative refinement must use Studio post-delivery iterations.

---

## 5. Marketing Pages Lighthouse & Performance Benchmarks

Audited under mobile emulation (Moto G Power, 4G throttling) and desktop viewport per production release:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | CLS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` (Homepage) | 98 | 100 | 100 | 100 | 1.1s | 0.00 |
| `/pricing` | 96 | 100 | 100 | 100 | 1.3s | 0.00 |
| `/how-it-works` | 99 | 100 | 100 | 100 | 0.9s | 0.00 |
| `/security` | 97 | 100 | 100 | 100 | 1.2s | 0.00 |
| `/demo` (Nova Showcase) | 95 | 98 | 100 | 100 | 1.4s | 0.01 |
| `/changelog` | 99 | 100 | 100 | 100 | 0.8s | 0.00 |
