import { expect, test } from "@playwright/test";
import { DEMO_ORG_SLUG } from "../lib/demo-constants";

test.describe("customer self-service cancellation", () => {
  test("guest books appointment, cancels via /b/[token], and verifies slot is released", async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);

    // 1. Book an appointment as guest
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);

    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("customer-name-input").fill("Cancel E2E Guest");
    await page.getByTestId("customer-phone-input").fill("0917 999 1111");
    await page.getByTestId("customer-email-input").fill("cancele2e@example.com");

    // Pick a slot comfortably in the future (> 24 hours ahead) to test self-service cancellation
    const slot = page.getByTestId("book-slot").last();
    await expect(slot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/b/([A-Za-z0-9_-]{43})\\?booked=1`), { timeout: 45_000 }),
      slot.click(),
    ]);

    const currentUrl = page.url();
    const tokenMatch = currentUrl.match(/\/b\/([A-Za-z0-9_-]{43})\?booked=1/);
    expect(tokenMatch).not.toBeNull();
    const rawToken = tokenMatch![1];

    // 2. Receipt renders with Cancel appointment button
    const cancelBtn = page.getByTestId("cancel-appointment-button");
    await expect(cancelBtn).toBeVisible();

    // 3. Open cancel dialog
    await cancelBtn.click();
    await expect(page.getByRole("heading", { name: "Cancel appointment" })).toBeVisible();

    // 4. Fill optional reason and note
    await page.getByTestId("cancel-reason-select").selectOption("schedule_conflict");
    await page.getByTestId("cancel-note-input").fill("Can no longer make this time.");

    // 5. Submit cancellation
    await page.getByTestId("confirm-cancel-button").click();

    // 6. Verify cancellation notice appears and status changes
    const notice = page.getByTestId("cancellation-notice");
    await expect(notice).toBeVisible({ timeout: 15_000 });
    await expect(notice).toContainText("Appointment cancelled");
    await expect(notice).toContainText("Schedule conflict");
    await expect(notice).toContainText("Can no longer make this time.");
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();

    // 7. Cancel button is gone
    await expect(page.getByTestId("cancel-appointment-button")).toHaveCount(0);

    // 8. Privacy: Phone and email must still not appear anywhere
    await expect(page.getByText("0917 999 1111")).toHaveCount(0);
    await expect(page.getByText("cancele2e@example.com")).toHaveCount(0);
    await expect(page.locator("main").getByText(rawToken)).toHaveCount(0);

    // 9. Reload /b/[token] directly without query param
    await page.goto(`/b/${rawToken}`);
    await expect(page.getByTestId("cancellation-notice")).toBeVisible();
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(page.getByTestId("cancel-appointment-button")).toHaveCount(0);

    // 10. Security headers still verified on cancelled receipt
    const response = await request.get(`/b/${rawToken}`);
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers["cache-control"]).toMatch(/no-store|no-cache/);
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["x-robots-tag"]).toContain("noindex");
  });

  test("appointment within 24 hours displays cutoff notice and hides cancel button", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);

    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("customer-name-input").fill("Cutoff Test Guest");
    await page.getByTestId("customer-phone-input").fill("0917 111 2222");

    // Today's first slot is within 24 hours
    const todaySlot = page.getByTestId("book-slot").first();
    await expect(todaySlot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/b/([A-Za-z0-9_-]{43})\\?booked=1`), { timeout: 45_000 }),
      todaySlot.click(),
    ]);

    // Verify cutoff notice is displayed and cancel button is hidden
    await expect(page.getByTestId("cancellation-cutoff-notice")).toBeVisible();
    await expect(page.getByTestId("cancel-appointment-button")).toHaveCount(0);
  });
});
