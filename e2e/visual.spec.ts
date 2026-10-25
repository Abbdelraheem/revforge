import { test, expect } from "@playwright/test";
import path from "node:path";

const PUBLIC_PAGES = [
  { path: "/", name: "home" },
  { path: "/pricing", name: "pricing" },
  { path: "/login", name: "login" },
  { path: "/this-route-does-not-exist", name: "not-found" },
];

test.describe("Responsive public screenshots", () => {
  for (const entry of PUBLIC_PAGES) {
    test(`${entry.name} renders without horizontal overflow`, async ({ page }, testInfo) => {
      await page.goto(entry.path);
      await page.waitForLoadState("networkidle");

      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        return {
          scrollWidth: root.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      });

      expect(
        overflow.scrollWidth,
        `${entry.path} scrollWidth ${overflow.scrollWidth} exceeds viewport ${overflow.viewportWidth}`
      ).toBeLessThanOrEqual(overflow.viewportWidth + 1);

      await page.screenshot({
        path: path.join(
          testInfo.outputDir,
          `${entry.name}-${testInfo.project.name}.png`
        ),
        fullPage: true,
      });
    });
  }
});
