import { test, expect } from "@playwright/test";

test.describe("Cart", () => {
  test("empty cart shows message", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByText(/empty|no items/i)).toBeVisible({ timeout: 10000 });
  });

  test("products listing loads", async ({ page }) => {
    await page.goto("/products");
    await page.waitForTimeout(3000);
    const products = page.locator("a[href*='/products/']");
    await expect(products.first()).toBeVisible({ timeout: 15000 });
  });
});