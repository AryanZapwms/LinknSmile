import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Instapeels|LinkAndSmile/i);
  });

  test("products page loads", async ({ page }) => {
    await page.goto("/products");
    await expect(page).toHaveURL(/products/);
  });

  test("cart page loads", async ({ page }) => {
    await page.goto("/cart");
    await expect(page).toHaveURL(/cart/);
  });
});