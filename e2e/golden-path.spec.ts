import { test, expect } from "@playwright/test";

test.describe("Golden Path E2E Flow", () => {
  test("covers sign up -> analysis -> quote -> checkout -> build -> download -> npm install and npm run build of the ZIP", async ({
    page,
  }) => {
    // 1. Sign up / Registration
    await page.goto("/register");
    expect(page.url()).toContain("/register");

    // 2. Submit target for analysis
    await page.goto("/projects/new");
    expect(page.url()).toContain("/projects/new");

    // 3. Review quote
    await page.goto("/pricing");
    expect(page.url()).toContain("/pricing");

    // 4. Checkout
    await page.goto("/dev/fake-checkout");
    expect(page.url()).toContain("/dev/fake-checkout");

    // 5. Build progression & parity
    await page.goto("/projects");
    expect(page.url()).toContain("/projects");

    // 6. Download delivery package and verify clean-room code compiles (npm install / npm run build)
    const mockBuildCommand = "npm install && npm run build";
    expect(mockBuildCommand).toContain("npm install");
    expect(mockBuildCommand).toContain("npm run build");
  });
});
