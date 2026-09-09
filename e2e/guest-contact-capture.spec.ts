import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT } from "../lib/demo-account";
import { DEMO_ORG_SLUG } from "../lib/demo-constants";

async function signInAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_ACCOUNT.email);
  await page.locator('input[name="password"]').fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

test.describe("guest contact capture", () => {
  test("requires name and mobile number for public booking", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);

    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    const contactSection = page.getByTestId("contact-details-section");
    await expect(contactSection).toBeVisible();

    const nameInput = page.getByTestId("customer-name-input");
    const phoneInput = page.getByTestId("customer-phone-input");
    const emailInput = page.getByTestId("customer-email-input");

    await expect(nameInput).toBeVisible();
    await expect(phoneInput).toBeVisible();
    await expect(emailInput).toBeVisible();

    // Attempting to book without contact details shows validation message
    const slot = page.getByTestId("book-slot").first();
    await expect(slot).toBeVisible({ timeout: 15_000 });
    await slot.click();

    await expect(
      page.getByText(/Please enter your name and mobile number before choosing a time/i),
    ).toBeVisible();
  });

  test("completes public guest booking with valid contact information", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);

    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("customer-name-input").fill("Carmela Reyes");
    await page.getByTestId("customer-phone-input").fill("0917 888 7777");
    await page.getByTestId("customer-email-input").fill("carmela@example.com");

    const slot = page.getByTestId("book-slot").first();
    await expect(slot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/s/${DEMO_ORG_SLUG}/book\\?booked=1`), { timeout: 45_000 }),
      slot.click(),
    ]);

    await expect(page.getByText(/Booked! Pay at the salon/i)).toBeVisible();
  });

  test("admin appointments board displays captured guest contact information and fallback", async ({ page }) => {
    test.setTimeout(60_000);
    await signInAdmin(page);
    await page.goto("/dashboard/admin/appointments");

    // 1. Verify snapshot appointment displays captured name, formatted phone, tel: link, and email
    const snapshotCard = page.locator("article").filter({ hasText: "Maria Santos" }).first();
    await expect(snapshotCard).toBeVisible();
    await expect(snapshotCard.getByText("0917 123 4567")).toBeVisible();
    await expect(
      snapshotCard.getByRole("link", { name: "0917 123 4567" }),
    ).toHaveAttribute("href", "tel:+639171234567");
    await expect(snapshotCard.getByText("(maria@example.com)")).toBeVisible();
    await expect(snapshotCard.getByText("customer@beautybook.local")).not.toBeVisible();

    // 2. Case 1 regression: snapshot has name and phone, but customerEmail = null; linked User email must NOT appear
    const noEmailSnapshotCard = page.locator("article").filter({ hasText: "Juan Dela Cruz" }).first();
    await expect(noEmailSnapshotCard).toBeVisible();
    await expect(noEmailSnapshotCard.getByText("0917 555 6677")).toBeVisible();
    await expect(noEmailSnapshotCard.getByText("customer@beautybook.local")).not.toBeVisible();

    // 3. Case 2 regression: appointment without snapshot falls back to account name
    const fallbackCard = page.locator("article").filter({ hasText: "Demo Customer" }).first();
    await expect(fallbackCard).toBeVisible();
  });
});
