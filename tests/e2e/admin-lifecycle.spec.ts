import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Admin Lifecycle UI', () => {
  // Use sequential mode because tests depend on state changes
  test.describe.configure({ mode: 'serial' });

  test('should register, approve, suspend, and reinstate provider', async ({ browser }) => {
    test.setTimeout(120000); // Give enough time for the full flow

    const phone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
    const pin = "1234";
    const providerName = `Dr. E2E Test ${Date.now()}`;

    // 1. Register a new provider
    const pContext = await browser.newContext();
    const pPage = await pContext.newPage();
    await pPage.goto('/en/register');
    await pPage.fill('input[name="phone"]', phone);
    await pPage.fill('input[name="pin"]', pin);
    await pPage.fill('input[name="confirmPin"]', pin);
    await pPage.fill('input[name="name"]', providerName);
    await pPage.selectOption('select[name="role"]', "VET_DOCTOR");
    await pPage.click('button[type="submit"]');

    // Step 2: Complete profile
    try {
      await pPage.waitForSelector('input[name="qualification"]', { timeout: 15000 });
    } catch (e) {
      const content = await pPage.content();
      console.log("PAGE CONTENT DUMP:", content);
      throw e;
    }
    await pPage.fill('input[name="qualification"]', "BVSc E2E");
    await pPage.fill('input[name="registrationNumber"]', `E2E-${Date.now()}`);
    await pPage.fill('input[name="registrationAuthority"]', "VCI E2E");
    await pPage.fill('input[name="yearsOfExperience"]', "5");
    await pPage.fill('input[name="serviceRadiusMeters"]', "20000");
    await pPage.fill('input[name="baseVisitFeePaise"]', "100");
    await pPage.fill('input[name="perKmFeePaise"]', "10");
    
    // Create a dummy document
    const dummyDocPath = path.join(__dirname, 'dummy.pdf');
    if (!fs.existsSync(dummyDocPath)) {
      fs.writeFileSync(dummyDocPath, "dummy content");
    }
    await pPage.setInputFiles('input[name="document"]', dummyDocPath);
    
    await pPage.click('button[type="submit"]');

    // Wait for Dashboard (PENDING state)
    await pPage.waitForURL("**/dashboard", { timeout: 15000 });
    await expect(pPage.getByText("Verification Pending")).toBeVisible({ timeout: 10000 });
    
    // Check duty toggle is disabled
    const dutyToggle = pPage.getByRole('switch');
    await expect(dutyToggle).toBeDisabled();

    // 2. Admin UI: Approve the provider
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/en/login');
    await adminPage.fill('input[name="phone"]', "+919999999999");
    await adminPage.fill('input[name="pin"]', "0000");
    await adminPage.click('button[type="submit"]');
    
    // Wait for redirect to admin verify
    await adminPage.waitForURL("**/admin/providers/verify", { timeout: 30000 });

    // Find our provider and approve
    const row = adminPage.locator('tr').filter({ hasText: providerName });
    await row.getByRole('button', { name: 'Approve' }).click();
    
    // Fill dialog
    await adminPage.waitForSelector('textarea[id="notes"]');
    await adminPage.fill('textarea[id="notes"]', "Looks good E2E");
    await adminPage.click('button:has-text("Confirm")');
    
    // Wait for dialog to close
    await expect(adminPage.getByRole('dialog')).toBeHidden();

    // 3. Provider checks dashboard (should be verified)
    await pPage.reload();
    await expect(pPage.getByText("Registration Verified")).toBeVisible({ timeout: 10000 });
    
    // Can go on duty now
    const dutyToggleAfter = pPage.getByRole('switch');
    await expect(dutyToggleAfter).toBeEnabled();
    await dutyToggleAfter.click();
    await expect(pPage.locator("text=On Duty")).toBeVisible({ timeout: 5000 });

    // 4. Admin Suspends Provider
    await adminPage.getByRole('tab', { name: 'Verified' }).click();
    const verifiedRow = adminPage.locator('tr').filter({ hasText: providerName });
    await verifiedRow.getByRole('button', { name: 'Suspend' }).click();
    
    await adminPage.waitForSelector('textarea[id="notes"]');
    await adminPage.fill('textarea[id="notes"]', "E2E Suspension");
    await adminPage.click('button:has-text("Confirm")');
    await expect(adminPage.getByRole('dialog')).toBeHidden();

    // 5. Provider checks dashboard (should be suspended and off-duty)
    await pPage.reload();
    await expect(pPage.getByText("Account Suspended")).toBeVisible({ timeout: 10000 });
    
    // Duty should be disabled and off
    const dutyToggleSuspended = pPage.getByRole('switch');
    await expect(dutyToggleSuspended).toBeDisabled();
    await expect(pPage.locator('p:has-text("Off Duty")')).toBeVisible({ timeout: 5000 });

    // 6. Admin Reinstates Provider
    await adminPage.getByRole('tab', { name: 'Suspended' }).click();
    const suspendedRow = adminPage.locator('tr').filter({ hasText: providerName });
    await suspendedRow.getByRole('button', { name: 'Reinstate' }).click();
    
    await adminPage.waitForSelector('textarea[id="notes"]');
    await adminPage.fill('textarea[id="notes"]', "E2E Reinstate");
    await adminPage.click('button:has-text("Confirm")');
    await expect(adminPage.getByRole('dialog')).toBeHidden();

    // 7. Provider checks dashboard (verified again)
    await pPage.reload();
    await expect(pPage.getByText("Registration Verified")).toBeVisible({ timeout: 10000 });
  });
});
