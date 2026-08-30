import { expect, test } from "@playwright/test";
import { DEMO_ORG_SLUG } from "../lib/demo-constants";

function nextManilaWeekdayIso() {
  const now = new Date();
  for (let offset = 1; offset <= 8; offset += 1) {
    const candidate = new Date(now.getTime() + offset * 86_400_000);
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      weekday: "short",
    }).format(candidate);
    if (weekday === "Sat" || weekday === "Sun") continue;
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(candidate);
  }
  throw new Error("Could not find a Manila weekday");
}

test.describe("search availability", () => {
  test("date filter shows real slots and books with prefilled params", async ({
    page,
  }) => {
    const date = nextManilaWeekdayIso();
    await page.goto(`/search?category=hair&date=${date}`);
    await expect(page.getByTestId("date-picker")).toHaveValue(date);

    const result = page.getByTestId("availability-result").first();
    await expect(result).toBeVisible();
    await expect(result.getByText("BeautyBook Demo Salon").or(result.getByText("Luxe Hair Lounge"))).toBeVisible();
    await expect(page.getByText("₱350.00").or(page.getByText("₱550.00")).first()).toBeVisible();

    const bookLink = result.getByTestId("book-availability");
    await expect(bookLink).toHaveAttribute("href", /serviceId=/);
    await expect(bookLink).toHaveAttribute("href", /locationId=/);
    await expect(bookLink).toHaveAttribute("href", /staffId=/);
    await expect(bookLink).toHaveAttribute("href", /startsAt=/);

    await bookLink.click();
    await page.waitForURL(new RegExp(`/s/(${DEMO_ORG_SLUG}|luxe-hair-lounge)/book\\?`));
    await expect(page.getByRole("heading", { name: "Book online" })).toBeVisible();
    await expect(page).toHaveURL(/serviceId=/);
    await expect(page).toHaveURL(/staffId=/);
    await expect(page).toHaveURL(/startsAt=/);
    await expect(page.getByTestId("book-slot").first()).toBeVisible();
  });
});
