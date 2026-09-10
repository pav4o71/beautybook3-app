import { expect, test } from "@playwright/test";
import { DEMO_ORG_SLUG } from "../lib/demo-constants";

test.describe("durable rate limiting & abuse protection", () => {
  test("enforces rate limit per phone number on public booking and allows distinct phone", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const testPhone = `0917${Math.floor(1000000 + Math.random() * 9000000)}`;
    const distinctPhone = `0918${Math.floor(1000000 + Math.random() * 9000000)}`;

    // Book 5 appointments to exhaust rate limit window (max 5)
    for (let i = 0; i < 5; i++) {
      await page.goto(`/s/${DEMO_ORG_SLUG}/book`);
      await page.getByRole("button", { name: /Haircut/i }).click();
      await page.getByRole("button", { name: /Maya Petrova/i }).click();
      await page.waitForLoadState("networkidle");

      await page.getByTestId("customer-name-input").fill(`Spam Tester ${i}`);
      await page.getByTestId("customer-phone-input").fill(testPhone);

      const slot = page.getByTestId("book-slot").nth(i);
      await expect(slot).toBeVisible({ timeout: 15_000 });

      await Promise.all([
        page.waitForURL(new RegExp(`/b/([A-Za-z0-9_-]{43})\\?booked=1`), { timeout: 30_000 }),
        slot.click(),
      ]);
    }

    // 6th attempt with same phone should be blocked by PostgreSQL rate limiting
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);
    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("customer-name-input").fill("Spam Tester 5");
    await page.getByTestId("customer-phone-input").fill(testPhone);

    const blockedSlot = page.getByTestId("book-slot").nth(5);
    await expect(blockedSlot).toBeVisible({ timeout: 15_000 });
    await blockedSlot.click();

    // Verify rate limit error message is displayed
    const rateLimitAlert = page.getByRole("alert").filter({ hasText: "Too many requests" });
    await expect(rateLimitAlert).toBeVisible({ timeout: 15_000 });
    await expect(rateLimitAlert).toContainText("Too many requests. Please wait a few minutes before trying again.");
    expect(page.url()).toContain(`/s/${DEMO_ORG_SLUG}/book`);

    // 7th attempt with a DIFFERENT phone should succeed immediately
    await page.getByTestId("customer-phone-input").fill(distinctPhone);
    const validSlot = page.getByTestId("book-slot").nth(6);
    await expect(validSlot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/b/([A-Za-z0-9_-]{43})\\?booked=1`), { timeout: 30_000 }),
      validSlot.click(),
    ]);

    await expect(page.getByRole("heading", { name: /Booking confirmed!/i })).toBeVisible();
  });
});
