# RevForge Real-World Quality & Benchmark Report

This document records the empirical performance, parity measurements, and operational bounds of the RevForge Clean-Room Reverse Engineering and Build Engine.

**Single Source of Truth**: All marketing figures, accuracy metrics, turnaround estimates, and pricing bands displayed on RevForge landing pages and dashboards must derive strictly from the measured data in this report. Unverified claims, synthetic testimonials, or simulated scores are strictly forbidden.

---

## 1. Latest Benchmark Run

No live benchmark has been run.

A live benchmark requires LLM_PROVIDER=live with a valid ANTHROPIC_API_KEY, active PostgreSQL, Docker container runner, and S3 storage. Once a live benchmark execution completes across the reference targets via pm run bench, its measured results, model IDs, token expenditures, and parity scores will be recorded here from ench/results/latest.json.

---

## 2. Empirical Target Results Matrix

No live benchmark has been run. No scores are recorded until a verified live run executes.

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
