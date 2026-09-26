import { test, expect } from '@playwright/test';

test.describe('Provider Dashboard UI', () => {
  test('should render properly for verified vet', async ({ page }) => {
    // 1. Login as Vet
    await page.goto('/en/login');
    await page.fill('input[name="phone"]', '+919876543200');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    try {
      await page.waitForURL('**/dashboard', { timeout: 15000 });
    } catch (e) {
      console.log("PAGE DUMP:", await page.content());
      throw e;
    }

    // Wait for profile name
    await expect(page.locator('text=Dr. Amit Singh')).toBeVisible({ timeout: 15000 });

    // Check Trust Badge
    await expect(page.locator('text=Registration Verified • Uttar Pradesh Veterinary Council')).toBeVisible({ timeout: 10000 });

    // Check Duty Status card
    await expect(page.locator('text=Duty Status')).toBeVisible({ timeout: 10000 });

    // Check Active Assigned Requests
    await expect(page.locator('text=Active Assigned Requests')).toBeVisible({ timeout: 10000 });

    // Check Live Emergency Feed
    await expect(page.locator('text=Live Emergency & Routine Feed')).toBeVisible({ timeout: 10000 });
  });
});
