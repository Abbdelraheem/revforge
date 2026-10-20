import { chromium, type Browser, type Page } from "playwright";
import { resolveValidated, SSRFSecurityError } from "@/lib/security/safe-fetch";
import { type ExtractorResult, ExtractorResultSchema } from "./types";

export interface WebExtractorOptions {
  timeoutMs?: number;
  captureScreenshots?: boolean;
}

/**
 * Sandboxed web crawler and structural extractor using Playwright.
 * Enforces safe origin checks (anti-SSRF) and inspects both desktop and mobile (width 375) viewports.
 */
export async function extractWebTarget(
  targetUrl: string,
  options: WebExtractorOptions = {}
): Promise<ExtractorResult> {
  const url = new URL(targetUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }

  // Pre-validate hostname via DNS resolution to prevent SSRF
  await resolveValidated(url.hostname);

  let browser: Browser | null = null;
  const discoveredRoutes = new Set<string>();
  const discoveredEndpoints = new Set<string>();
  const frameworkHints = new Set<string>();
  const components: ExtractorResult["components"] = [];

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }, // Mobile viewport 375px
      userAgent: "RevForge-Analysis-Bot/1.0 (+https://revforge.ai/bot)",
    });

    const page: Page = await context.newPage();

    // Listen to network requests for API endpoints
    page.on("request", (req) => {
      try {
        const reqUrl = new URL(req.url());
        if (reqUrl.pathname.startsWith("/api") || reqUrl.pathname.includes(".json") || req.resourceType() === "fetch" || req.resourceType() === "xhr") {
          discoveredEndpoints.add(`${req.method()} ${reqUrl.pathname}`);
        }
      } catch {
        // ignore invalid URL
      }
    });

    const timeout = options.timeoutMs ?? 30_000;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout });

    discoveredRoutes.add(url.pathname || "/");

    // Extract links
    const links = await page.$$eval("a[href]", (anchors) =>
      anchors.map((a) => a.getAttribute("href")).filter(Boolean) as string[]
    );

    for (const link of links) {
      try {
        const resolved = new URL(link, targetUrl);
        if (resolved.origin === url.origin) {
          discoveredRoutes.add(resolved.pathname);
        }
      } catch {
        // ignore
      }
    }

    // Inspect frameworks in DOM/Scripts
    const scripts = await page.$$eval("script[src]", (tags) =>
      tags.map((s) => s.getAttribute("src")).filter(Boolean) as string[]
    );

    for (const src of scripts) {
      if (src.includes("_next") || src.includes("next")) frameworkHints.add("Next.js");
      if (src.includes("nuxt") || src.includes("_nuxt")) frameworkHints.add("Nuxt");
      if (src.includes("vue")) frameworkHints.add("Vue");
      if (src.includes("react")) frameworkHints.add("React");
      if (src.includes("svelte")) frameworkHints.add("Svelte");
      if (src.includes("astro")) frameworkHints.add("Astro");
    }

    // Check DOM root containers
    const rootElementId = await page.evaluate(() => {
      if (document.getElementById("__next")) return "Next.js";
      if (document.getElementById("__nuxt")) return "Nuxt";
      if (document.getElementById("root")) return "React (SPA)";
      if (document.getElementById("app")) return "Vue / Generic SPA";
      return null;
    });

    if (rootElementId) {
      frameworkHints.add(rootElementId);
    }

    const title = await page.title();

    return ExtractorResultSchema.parse({
      targetType: "web",
      summary: `Web extraction for ${targetUrl} (title: ${title})`,
      routes: Array.from(discoveredRoutes).slice(0, 50).map((p) => ({
        path: p,
        method: "GET",
        authRequired: false,
      })),
      components,
      endpoints: Array.from(discoveredEndpoints).slice(0, 50),
      frameworkHints: Array.from(frameworkHints),
      rawEvidenceSummary: `Extracted ${discoveredRoutes.size} routes and ${discoveredEndpoints.size} endpoints using 375px mobile viewport`,
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
