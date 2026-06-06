import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page).toHaveTitle(/Instapeels|LinkAndSmile/i);
  });

  test("invalid login shows error", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByLabel(/email/i).fill("invalid@test.com");
  await page.getByLabel(/password/i).fill("wrongpassword");
  await page.locator("main").getByRole("button", { name: /login|sign in/i }).click();
  // Wait for any error/toast notification to appear
  await expect(
    page.getByText(/invalid|incorrect|wrong|failed|unable|try again/i)
  ).toBeVisible({ timeout: 15000 });
});

  test("checkout redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/login/, { timeout: 15000 });
  });
});