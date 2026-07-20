import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  // Setup: Assume localhost:3000 is running and reachable.
  
  test('Dashboard Visual Validation', async ({ page }) => {
    await page.goto('/');
    // Wait for the hydration to settle
    await page.waitForTimeout(2000); 
    // Take a full page screenshot and compare
    await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });
  });

  test('Budget vs Actual Visual Validation', async ({ page }) => {
    await page.goto('/budgets');
    // The previous 500 error should be fixed by the deployed indexes
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('budgets.png', { fullPage: true });
  });

  test('Transactions Table Visual Validation', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('transactions.png', { fullPage: true });
  });
});
