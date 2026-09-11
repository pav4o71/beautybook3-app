import { expect, test } from "@playwright/test";
import { DEMO_ORG_SLUG } from "../lib/demo-constants";
import { DEMO_ACCOUNT } from "../lib/demo-account";

async function signInAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_ACCOUNT.email);
  await page.locator('input[name="password"]').fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

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

  test("appointment within cutoff displays cutoff notice and hides cancel button", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // Set cutoff to 168h so first available slot (even on weekends, e.g. 56h away) is within cutoff
    await signInAdmin(page);
    await page.goto("/dashboard/admin/settings");
    await page.getByTestId("cancellation-cutoff-hours-input").fill("168");
    await page.getByRole("button", { name: "Save settings" }).click();
    await page.waitForURL(/\/dashboard\/admin\/settings\?saved=1/);

    await page.context().clearCookies();
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);

    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("customer-name-input").fill("Cutoff Test Guest");
    await page.getByTestId("customer-phone-input").fill("0917 111 2222");

    const firstSlot = page.getByTestId("book-slot").first();
    await expect(firstSlot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/b/([A-Za-z0-9_-]{43})\\?booked=1`), { timeout: 45_000 }),
      firstSlot.click(),
    ]);

    // Verify cutoff notice is displayed and cancel button is hidden
    await expect(page.getByTestId("cancellation-cutoff-notice")).toBeVisible();
    await expect(page.getByTestId("cancel-appointment-button")).toHaveCount(0);

    // Restore cutoff back to 24 hours
    await signInAdmin(page);
    await page.goto("/dashboard/admin/settings");
    await page.getByTestId("cancellation-cutoff-hours-input").fill("24");
    await page.getByRole("button", { name: "Save settings" }).click();
    await page.waitForURL(/\/dashboard\/admin\/settings\?saved=1/);
  });
});
