import { test, expect } from "@playwright/test";

test.describe("Site Crawler E2E Suite", () => {
  const routesToTest = [
    "/",
    "/how-it-works",
    "/pricing",
    "/security",
    "/use-cases",
    "/docs",
    "/faq",
    "/status",
    "/contact",
    "/terms",
    "/privacy",
    "/acceptable-use",
    "/clean-room-ip-policy",
    "/refund-policy",
    "/dmca",
    "/changelog",
    "/login",
    "/register",
  ];

  for (const route of routesToTest) {
    test(`crawls ${route} and verifies clean 200 response`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });
  }
});
