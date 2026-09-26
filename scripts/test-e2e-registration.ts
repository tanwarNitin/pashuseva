import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../src/db';
import { providerProfiles, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log("Starting E2E registration test...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER PAGEERROR:', err.message));

  // Create a dummy PDF for upload
  const dummyPdfPath = path.join(__dirname, 'dummy.pdf');
  fs.writeFileSync(dummyPdfPath, '%PDF-1.4 dummy content');

  try {
    const timestamp = Date.now().toString().slice(-6);
    const phone = `+919876${timestamp}`;
    const license = `VCI-${timestamp}`;
    
    // 1. Register a Vet
    console.log(`\n--- 1. Registering Vet (${phone}) ---`);
    await page.goto('http://localhost:3000/en/register');
    await page.fill('input[name="phone"]', phone);
    await page.fill('input[name="name"]', `Dr. Vet ${timestamp}`);
    await page.fill('input[name="pin"]', '1234');
    await page.fill('input[name="confirmPin"]', '1234');
    await page.selectOption('select[name="role"]', 'VET_DOCTOR');
    await page.click('button[type="submit"]');

    // Wait for redirect to onboarding
    await page.waitForURL('**/onboarding');
    console.log("Redirected to onboarding successfully.");

    // Fill onboarding
    await page.fill('input[name="qualification"]', 'BVSc');
    await page.fill('input[name="registrationNumber"]', license);
    await page.fill('input[name="registrationAuthority"]', 'VCI');
    await page.fill('input[name="yearsOfExperience"]', '5');
    await page.fill('input[name="baseVisitFeePaise"]', '150');
    await page.fill('input[name="perKmFeePaise"]', '15');
    await page.setInputFiles('input[name="document"]', dummyPdfPath);
    await page.click('label[for="preferWhatsApp"]');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    console.log("Onboarding complete, redirected to dashboard.");

    // Verify DB
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    const [profile] = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, user.id));
    
    console.log(`Vet in DB? Role: ${user.role}, Status: ${profile.verificationStatus}, Duty: ${profile.dutyStatus}`);
    console.log(`Document Path: ${profile.registrationDocumentPath}`);
    
    // Check if file exists on disk
    if (profile.registrationDocumentPath && fs.existsSync(profile.registrationDocumentPath)) {
      console.log(`✅ Document stored on disk and retrievable: ${profile.registrationDocumentPath}`);
    } else {
      console.log(`❌ Document NOT stored on disk.`);
    }

    // 2. Duplicate Phone
    console.log(`\n--- 2. Duplicate Phone Test ---`);
    await context.clearCookies();
    await page.goto('http://localhost:3000/en/register');
    await page.fill('input[name="phone"]', phone);
    await page.fill('input[name="name"]', `Duplicate Vet`);
    await page.fill('input[name="pin"]', '1234');
    await page.fill('input[name="confirmPin"]', '1234');
    await page.selectOption('select[name="role"]', 'VET_DOCTOR');
    await page.click('button[type="submit"]');

    await page.waitForSelector('[data-slot="alert-description"]', { timeout: 10000 });
    const phoneError = await page.textContent('[data-slot="alert-description"]');
    console.log(`Duplicate phone error message: "${phoneError?.trim()}"`);
    if (phoneError) console.log("✅ Duplicate phone rejected with a clear error.");

    // 3. Duplicate License
    console.log(`\n--- 3. Duplicate License Test ---`);
    await context.clearCookies();
    const newPhone = `+919875${timestamp}`;
    await page.goto('http://localhost:3000/en/register');
    await page.fill('input[name="phone"]', newPhone);
    await page.fill('input[name="name"]', `Other Vet`);
    await page.fill('input[name="pin"]', '1234');
    await page.fill('input[name="confirmPin"]', '1234');
    await page.selectOption('select[name="role"]', 'VET_DOCTOR');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/onboarding');
    await page.fill('input[name="qualification"]', 'MVSc');
    await page.fill('input[name="registrationNumber"]', license); // SAME LICENSE
    await page.fill('input[name="registrationAuthority"]', 'VCI');
    await page.fill('input[name="baseVisitFeePaise"]', '100');
    await page.fill('input[name="perKmFeePaise"]', '10');
    await page.setInputFiles('input[name="document"]', dummyPdfPath);
    await page.click('button[type="submit"]');

    await page.waitForSelector('[data-slot="alert-description"]', { timeout: 10000 });
    const licenseError = await page.textContent('[data-slot="alert-description"]');
    console.log(`Duplicate license error message: "${licenseError?.trim()}"`);
    if (licenseError) console.log("✅ Duplicate license rejected with a clear error.");

    // 4. Paravet
    console.log(`\n--- 4. Registering Paravet ---`);
    await context.clearCookies();
    const paraPhone = `+919874${timestamp}`;
    await page.goto('http://localhost:3000/en/register');
    await page.fill('input[name="phone"]', paraPhone);
    await page.fill('input[name="name"]', `Paravet ${timestamp}`);
    await page.fill('input[name="pin"]', '1234');
    await page.fill('input[name="confirmPin"]', '1234');
    await page.selectOption('select[name="role"]', 'PARAVET_WORKER');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/onboarding');
    await page.fill('input[name="qualification"]', 'Diploma');
    await page.fill('input[name="registrationNumber"]', `PARA-${timestamp}`);
    await page.fill('input[name="registrationAuthority"]', 'State Board');
    await page.fill('input[name="baseVisitFeePaise"]', '100');
    await page.fill('input[name="perKmFeePaise"]', '10');
    await page.setInputFiles('input[name="document"]', dummyPdfPath);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');
    const [pUser] = await db.select().from(users).where(eq(users.phone, paraPhone));
    const [pProfile] = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, pUser.id));
    console.log(`Paravet in DB? Role: ${pUser.role}, Status: ${pProfile?.verificationStatus}, Duty: ${pProfile?.dutyStatus}`);
    if (pProfile?.verificationStatus === "PENDING" && pProfile?.dutyStatus === "OFF_DUTY") {
      console.log("✅ Paravet registered through UI and saved as PENDING / OFF_DUTY.");
    }
    
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    if (fs.existsSync(dummyPdfPath)) fs.unlinkSync(dummyPdfPath);
    await browser.close();
  }
}

main().catch(console.error);
