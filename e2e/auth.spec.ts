import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT, DEMO_CUSTOMER } from "../lib/demo-account";

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
  await page.waitForLoadState("networkidle");
}

test.describe("authentication", () => {
  test("admin sees Admin link", async ({ page }) => {
    await signIn(page, DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Admin", exact: true }),
    ).toBeVisible();
  });

  test("customer does not see Admin link", async ({ page }) => {
    await signIn(page, DEMO_CUSTOMER.email, DEMO_CUSTOMER.password);
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
  });

  test("customer is redirected from admin", async ({ page }) => {
    await signIn(page, DEMO_CUSTOMER.email, DEMO_CUSTOMER.password);
    await page.goto("/dashboard/admin");
    await page.waitForURL("/dashboard");
  });

  test("wrong password shows an error", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(DEMO_ACCOUNT.email);
    await page.locator('input[name="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/login");
    await expect(page.getByText(/could not sign in|invalid|incorrect/i)).toBeVisible();
  });

  test("sign out returns to login", async ({ page }) => {
    await signIn(page, DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");
    await page.goto("/dashboard");
    await page.waitForURL("/login");
  });
});
