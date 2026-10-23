import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
];

const PUBLIC_ROUTES = [
  { path: "/", name: "home" },
  { path: "/pricing", name: "pricing" },
  { path: "/how-it-works", name: "how-it-works" },
  { path: "/login", name: "login" },
  { path: "/register", name: "register" },
  { path: "/terms", name: "terms" },
  { path: "/privacy", name: "privacy" },
  { path: "/status", name: "status" },
];

test.describe("Whole-App Visual & Responsive Screenshots Suite", () => {
  for (const route of PUBLIC_ROUTES) {
    for (const vp of VIEWPORTS) {
      test(`captures responsive layout on ${route.name} at ${vp.width}px (${vp.name})`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const response = await page.goto(route.path);

        // Verify page loads without 404/500 errors
        expect(response?.status()).toBeLessThan(400);

        // Verify accessibility landmarks
        const main = page.locator("main");
        const count = await main.count();
        expect(count).toBeGreaterThanOrEqual(1);

        // Capture screenshot artifact
        await page.screenshot({
          path: `test-results/screenshots/${route.name}-${vp.name}.png`,
          fullPage: false,
        });
      });
    }
  }
});
