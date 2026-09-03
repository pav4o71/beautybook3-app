import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT } from "../lib/demo-account";
import { DEMO_ORG_SLUG, LUXE_ORG_SLUG } from "../lib/demo-constants";

async function signInAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_ACCOUNT.email);
  await page.locator('input[name="password"]').fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

test.describe("listing customization", () => {
  test("marketplace cards show city and area", async ({ page }) => {
    await page.goto("/?category=hair&area=Makati");
    await expect(page.getByTestId(`business-${DEMO_ORG_SLUG}`)).toBeVisible();
    await expect(
      page.getByTestId(`business-${DEMO_ORG_SLUG}`).getByText("Manila · Makati"),
    ).toBeVisible();
  });

  test("premium salon storefront renders themed gallery sections", async ({ page }) => {
    await page.goto(`/s/${LUXE_ORG_SLUG}`);
    await expect(page.getByRole("heading", { name: "Gallery" })).toBeVisible();
    await expect(page.getByText("Premium", { exact: true })).toBeVisible();
  });

  test("admin can open listing editor", async ({ page }) => {
    await signInAdmin(page);
    await page.goto("/dashboard/admin/listing-editor");
    await expect(page.getByRole("heading", { name: "Customize listing" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Card", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Storefront" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save listing" })).toBeVisible();
  });
});
