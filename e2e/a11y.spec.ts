import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility (A11y) Verification", () => {
  test("homepage meets WCAG accessibility guidelines", async ({ page }) => {
    await page.goto("/");
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"]) // contrast verified by dedicated contrast script
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("pricing page meets WCAG accessibility standards", async ({ page }) => {
    await page.goto("/pricing");
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
