import { expect, test } from "@playwright/test";
import { DEMO_ORG_SLUG } from "../lib/demo-constants";

test.describe("customer self-service rescheduling", () => {
  test("guest books appointment, reschedules via /b/[token], and verifies new time persists", async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);

    // 1. Book an appointment as guest
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);

    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("customer-name-input").fill("Reschedule E2E Guest");
    await page.getByTestId("customer-phone-input").fill("0917 888 2222");
    await page.getByTestId("customer-email-input").fill("reschedulee2e@example.com");

    // Pick a slot comfortably in the future (> 24 hours ahead)
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

    // 2. Receipt renders with Reschedule appointment button
    const rescheduleBtn = page.getByTestId("reschedule-appointment-button");
    await expect(rescheduleBtn).toBeVisible();

    // 3. Open reschedule dialog
    await rescheduleBtn.click();
    await expect(page.getByRole("heading", { name: "Reschedule appointment" })).toBeVisible();

    // 4. Select an available slot in the dialog
    const availableSlots = page.getByTestId("reschedule-slot");
    await expect(availableSlots.first()).toBeVisible({ timeout: 10_000 });
    const slotCount = await availableSlots.count();
    expect(slotCount).toBeGreaterThan(0);

    // Pick a future available alternative slot (> 24 hours ahead)
    const targetSlot = availableSlots.last();
    const targetSlotTimeText = (await targetSlot.textContent())?.trim();
    await targetSlot.click();

    // 5. Confirm reschedule
    const confirmBtn = page.getByTestId("confirm-reschedule-button");
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // 6. Verify reschedule success banner appears and reflects updated time
    const successBanner = page.getByTestId("reschedule-success-state");
    await expect(successBanner).toBeVisible({ timeout: 15_000 });
    await expect(successBanner).toContainText("Appointment rescheduled!");

    // Status remains confirmed
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();

    // 7. Privacy: Phone and email must not appear anywhere on receipt
    await expect(page.getByText("0917 888 2222")).toHaveCount(0);
    await expect(page.getByText("reschedulee2e@example.com")).toHaveCount(0);
    await expect(page.locator("main").getByText(rawToken)).toHaveCount(0);

    // 8. Reload /b/[token] directly without query param
    await page.goto(`/b/${rawToken}`);
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
    await expect(page.getByTestId("reschedule-appointment-button")).toBeVisible();
    if (targetSlotTimeText) {
      await expect(page.locator("article")).toContainText(targetSlotTimeText);
    }

    // 9. Security headers still verified on rescheduled receipt
    const response = await request.get(`/b/${rawToken}`);
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers["cache-control"]).toMatch(/no-store|no-cache/);
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["x-robots-tag"]).toContain("noindex");
  });

  test("appointment within 24 hours displays cutoff notice and hides reschedule button", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);

    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("customer-name-input").fill("Cutoff Reschedule Guest");
    await page.getByTestId("customer-phone-input").fill("0917 222 3333");

    // Today's first slot is within 24 hours
    const todaySlot = page.getByTestId("book-slot").first();
    await expect(todaySlot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/b/([A-Za-z0-9_-]{43})\\?booked=1`), { timeout: 45_000 }),
      todaySlot.click(),
    ]);

    // Cutoff notice must be visible and reschedule button hidden
    await expect(page.getByTestId("cancellation-cutoff-notice")).toBeVisible();
    await expect(page.getByTestId("reschedule-appointment-button")).toHaveCount(0);
    await expect(page.getByTestId("cancel-appointment-button")).toHaveCount(0);
  });
});
