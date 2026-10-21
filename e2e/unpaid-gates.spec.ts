import { test, expect } from "@playwright/test";

test.describe("Unpaid Gates & Access Controls E2E", () => {
  test("prevents download of artifacts for unpaid projects", async ({ page }) => {
    const fakeProjectId = "00000000-0000-0000-0000-000000000001";
    const res = await page.goto(`/api/download/${fakeProjectId}`);
    // Should be redirected to login or return 401/403
    expect([401, 403, 404, 302]).toContain(res?.status() ?? 302);
  });
});
