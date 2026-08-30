import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT, GLOW_OWNER } from "../lib/demo-account";

async function signIn(
  page: import("@playwright/test").Page,
  account: { email: string; password: string },
) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

test.describe("cross-org isolation", () => {
  test("glow owner admin staff list excludes demo salon staff", async ({ page }) => {
    await signIn(page, GLOW_OWNER);
    await page.goto("/dashboard/admin/staff");
    await expect(page.getByRole("heading", { name: "Staff", exact: true })).toBeVisible();
    await expect(page.getByText("Ana Cruz")).toBeVisible();
    await expect(page.getByText("Maya Petrova")).toHaveCount(0);
    await expect(page.getByText("Lena Dimitrova")).toHaveCount(0);
  });

  test("demo admin staff list excludes glow salon staff", async ({ page }) => {
    await signIn(page, DEMO_ACCOUNT);
    await page.goto("/dashboard/admin/staff");
    await expect(page.getByRole("heading", { name: "Staff", exact: true })).toBeVisible();
    await expect(page.getByText("Maya Petrova")).toBeVisible();
    await expect(page.getByText("Ana Cruz")).toHaveCount(0);
    await expect(page.getByText("Bea Santos")).toHaveCount(0);
  });

  test("glow owner cannot access demo org via admin services", async ({ page }) => {
    await signIn(page, GLOW_OWNER);
    await page.goto("/dashboard/admin/services");
    await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();
    await expect(page.getByText("Deep conditioning")).toHaveCount(0);
    await expect(page.getByText("Gel manicure")).toBeVisible();
  });
});
