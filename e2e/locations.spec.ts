import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT } from "../lib/demo-account";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_ACCOUNT.email);
  await page.locator('input[name="password"]').fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

test.describe("locations admin", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("lists default location and creates a new branch", async ({ page }) => {
    const suffix = Date.now();
    const branchName = `E2E Branch ${suffix}`;
    const branchAddress = `123 Test Street ${suffix}, Makati`;

    await page.goto("/dashboard/admin/locations");
    await expect(page.getByRole("heading", { name: "Locations" })).toBeVisible();
    await expect(page.getByText("Main location")).toBeVisible();
    await expect(page.getByText("Default", { exact: true })).toBeVisible();

    await page.locator('input[name="name"]').fill(branchName);
    await page.locator('input[name="address"]').fill(branchAddress);
    await page.getByRole("button", { name: "Create location" }).click();

    await page.waitForURL("/dashboard/admin/locations");
    const row = page.locator("li").filter({ hasText: branchName });
    await expect(row).toBeVisible();
    await expect(row.getByText(branchAddress)).toBeVisible();
  });
});
