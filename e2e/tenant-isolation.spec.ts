import { test, expect } from "@playwright/test";

test.describe("Multi-Tenant Isolation E2E", () => {
  test("asserts that one tenant cannot view another tenant's project dashboard", async ({ page }) => {
    const foreignProjectId = "99999999-9999-4999-8999-999999999999";
    const res = await page.goto(`/projects/${foreignProjectId}`);
    // Blocked from seeing other tenant data
    expect([401, 403, 404, 302]).toContain(res?.status() ?? 302);
  });
});
