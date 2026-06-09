import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page).toHaveTitle(/Instapeels|LinkAndSmile/i);
  });

  test("invalid login shows error", async ({ page }) => {
    await page.goto("/auth/login");
    await page.locator("#email").fill("invalid@test.com");
    await page.locator("#password").fill("wrongpassword");
    await page.locator("main").getByRole("button", { name: /login|sign in/i }).click();
    await expect(
      page.getByText(/invalid|incorrect|wrong|failed|unable|try again/i)
    ).toBeVisible({ timeout: 15000 });
  });

  test("checkout requires login", async ({ page }) => {
    await page.goto("/checkout");
    // Client-side redirect — wait for session check then redirect
    await page.waitForURL(/login/, { timeout: 20000 });
    await expect(page).toHaveURL(/login/);
  });
});