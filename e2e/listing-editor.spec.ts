import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT, LUXE_OWNER } from "../lib/demo-account";
import { DEMO_ORG_SLUG, LUXE_ORG_SLUG } from "../lib/demo-constants";

async function signIn(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
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
    await expect(page.getByText("Salon exterior")).toBeVisible();
  });

  test("admin can open listing editor", async ({ page }) => {
    await signIn(page, DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
    await page.goto("/dashboard/admin/listing-editor");
    await expect(page.getByRole("heading", { name: "Customize listing" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Card", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Storefront" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save listing" })).toBeVisible();
  });

  test("premium owner can save theme and see it on the card", async ({ page }) => {
    await signIn(page, LUXE_OWNER.email, LUXE_OWNER.password);
    await page.goto("/dashboard/admin/listing-editor");
    await expect(page.getByRole("heading", { name: "Customize listing" })).toBeVisible();
    await expect(page.getByText(/Premium listing/i)).toBeVisible();

    const accent = page.locator('input[type="color"]').nth(2);
    await accent.fill("#0F766E");
    await page.getByRole("button", { name: "Save listing" }).click();
    await page.waitForURL(/listing-editor\?saved=1/);

    await page.goto("/");
    const card = page.getByTestId(`business-${LUXE_ORG_SLUG}`);
    await expect(card).toBeVisible();
    await expect(card).toHaveCSS("border-color", "rgb(15, 118, 110)");
  });
});
