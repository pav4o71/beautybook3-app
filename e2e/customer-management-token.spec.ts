import { expect, test } from "@playwright/test";
import { DEMO_ORG_SLUG } from "../lib/demo-constants";

test.describe("customer management token receipt", () => {
  test("public guest booking redirects to /b/[token]?booked=1 and renders safe read-only receipt", async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    await page.goto(`/s/${DEMO_ORG_SLUG}/book`);

    await page.getByRole("button", { name: /Haircut/i }).click();
    await page.getByRole("button", { name: /Maya Petrova/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("customer-name-input").fill("A2 Test Guest");
    await page.getByTestId("customer-phone-input").fill("0917 555 1234");
    await page.getByTestId("customer-email-input").fill("a2guest@example.com");

    const slot = page.getByTestId("book-slot").first();
    await expect(slot).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/b/([A-Za-z0-9_-]{43})\\?booked=1`), { timeout: 45_000 }),
      slot.click(),
    ]);

    // 1. Validate URL matches 256-bit base64url token pattern
    const currentUrl = page.url();
    const tokenMatch = currentUrl.match(/\/b\/([A-Za-z0-9_-]{43})\?booked=1/);
    expect(tokenMatch).not.toBeNull();
    const rawToken = tokenMatch![1];
    expect(rawToken).toHaveLength(43);

    // 2. Validate success confirmation state
    await expect(page.getByTestId("booking-success-state")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Booking confirmed!" })).toBeVisible();
    await expect(page.getByText("Save this link to manage your appointment anytime.")).toBeVisible();

    // 3. Validate copy link button is present
    const copyButton = page.getByTestId("copy-management-link").first();
    await expect(copyButton).toBeVisible();

    // 4. Validate appointment summary
    await expect(page.getByRole("heading", { name: "Appointment details" })).toBeVisible();
    await expect(page.getByText("Maya Petrova")).toBeVisible();
    await expect(page.getByText("Haircut").first()).toBeVisible();
    await expect(page.getByText("Booked for A2 Test Guest")).toBeVisible();
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();

    // 5. Privacy: phone and email must NOT be exposed
    await expect(page.getByText("0917 555 1234")).toHaveCount(0);
    await expect(page.getByText("09175551234")).toHaveCount(0);
    await expect(page.getByText("+639175551234")).toHaveCount(0);
    await expect(page.getByText("a2guest@example.com")).toHaveCount(0);

    // 6. Privacy: raw token or hash must NOT be displayed as visible body text
    await expect(page.locator("main").getByText(rawToken)).toHaveCount(0);

    // 7. Security: Verify robots noindex metadata on page
    const robotsMeta = page.locator('meta[name="robots"]');
    await expect(robotsMeta).toHaveAttribute("content", /noindex/);

    // 8. Security: Verify HTTP response headers on /b/[token]
    const response = await request.get(`/b/${rawToken}`);
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers["cache-control"]).toMatch(/no-store|no-cache/);
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["x-robots-tag"]).toContain("noindex");
  });

  test("invalid or non-existent token returns 404", async ({ page }) => {
    // Valid 43-character base64url token, but does not exist in DB
    const fakeToken = "A".repeat(43);
    const response = await page.goto(`/b/${fakeToken}`);
    expect(response?.status()).toBe(404);
  });

  test("malformed token returns 404 without internal server error", async ({ page }) => {
    // Malformed token (wrong length, illegal chars)
    const malformedToken = "too-short";
    const response = await page.goto(`/b/${malformedToken}`);
    expect(response?.status()).toBe(404);
  });
});
