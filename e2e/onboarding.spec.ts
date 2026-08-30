import { test } from "@playwright/test";

test.describe("onboarding", () => {
  test("user without membership sees onboarding form", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForURL("/login");
  });
});
