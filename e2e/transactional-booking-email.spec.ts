import { expect, test } from "@playwright/test";
import { DEMO_ORG_SLUG } from "../lib/demo-constants";

test.describe("transactional booking email flow", () => {
  test("completes public booking with customer email and redirects to safe capability receipt", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);

    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    const uniqueEmail = `elena-${Date.now()}@example.com`;
    await page.getByTestId("customer-name-input").fill("Elena Gomez");
    await page.getByTestId("customer-phone-input").fill("0917 123 4567");
    await page.getByTestId("customer-email-input").fill(uniqueEmail);

    const slot = page.getByTestId("book-slot").first();
    await expect(slot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/b/([A-Za-z0-9_-]{43})\\?booked=1`), { timeout: 45_000 }),
      slot.click(),
    ]);

    // Extract raw token from URL
    const currentUrl = page.url();
    const tokenMatch = currentUrl.match(/\/b\/([A-Za-z0-9_-]{43})\?booked=1/);
    expect(tokenMatch).not.toBeNull();
    const rawToken = tokenMatch![1];
    expect(rawToken).toHaveLength(43);

    await expect(page.getByRole("heading", { name: /Booking confirmed!/i })).toBeVisible();
    await expect(page.getByTestId("booking-success-state")).toBeVisible();

    // Security: verify raw token is not exposed in body text
    await expect(page.locator("main").getByText(rawToken)).toHaveCount(0);
  });

  test("completes public booking without customer email and renders receipt", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);

    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("customer-name-input").fill(`No Email ${Date.now()}`);
    await page.getByTestId("customer-phone-input").fill("0917 222 3344");

    const slot = page.getByTestId("book-slot").first();
    await expect(slot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/b/([A-Za-z0-9_-]{43})\\?booked=1`), { timeout: 45_000 }),
      slot.click(),
    ]);

    await expect(page.getByRole("heading", { name: /Booking confirmed!/i })).toBeVisible();
  });
});
