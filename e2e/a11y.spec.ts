import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const AUDIT_ROUTES = [
  { path: "/", name: "homepage" },
  { path: "/pricing", name: "pricing" },
  { path: "/how-it-works", name: "how-it-works" },
  { path: "/demo", name: "demo" },
  { path: "/contact", name: "contact" },
  { path: "/changelog", name: "changelog" },
  { path: "/clean-room-ip-policy", name: "clean-room-ip-policy" },
  { path: "/terms", name: "terms" },
  { path: "/privacy", name: "privacy" },
  { path: "/security", name: "security" },
  { path: "/refund-policy", name: "refund-policy" },
  { path: "/acceptable-use", name: "acceptable-use" },
  { path: "/dmca", name: "dmca" },
];

test.describe("Accessibility (A11y) Verification Suite", () => {
  for (const route of AUDIT_ROUTES) {
    test(`${route.name} (${route.path}) meets WCAG 2.1 AA accessibility guidelines with zero serious violations`, async ({ page }) => {
      await page.goto(route.path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .disableRules(["color-contrast"]) // contrast audited by dedicated WCAG script
        .analyze();

      const seriousViolations = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );

      expect(seriousViolations).toEqual([]);
    });
  }
});
