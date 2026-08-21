import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('E2E upload and reload test', async ({ page }) => {
  // 1. Go to the login page
  await page.goto('http://localhost:3000/login');

  // 2. Switch to Register tab (since the previous test might not have registered properly, let's create a guaranteed fresh user)
  const uniqueEmail = `e2e_${Date.now()}@enset.ma`;
  await page.getByRole('button', { name: 'REGISTER' }).click();

  await page.getByLabel('Name').fill('E2E Tester');
  await page.getByLabel('Email', { exact: true }).fill(uniqueEmail);
  await page.getByLabel('Password', { exact: true }).fill('Password123!');
  await page.getByLabel('Confirm Password').fill('Password123!');
  await page.getByRole('button', { name: 'INITIALIZE ACCESS' }).click();

  // Wait to reach the chat page
  await page.waitForURL('**/chat');

  // 3. Create a dummy PDF to upload
  const dummyPdfPath = path.join(__dirname, 'TEST_DOC_123.pdf');
  fs.writeFileSync(dummyPdfPath, 'dummy pdf content for e2e test');

  // 4. Upload the document via file chooser
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('input[type="file"]').click({ force: true });
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(dummyPdfPath);

  // 5. The upload rename modal might pop up if the name isn't valid, but TEST_DOC_123.pdf might be valid.
  // Wait for the modal or upload success.
  const confirmBtn = page.getByRole('button', { name: 'Confirm & Upload All' });
  if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
  }

  // 6. Wait for the document to appear in the sidebar
  // We can look for the text "TEST_DOC_123"
  await expect(page.locator('.w-72.border-r').locator('text=TEST_DOC_123.pdf')).toBeVisible({ timeout: 15000 });

  // 7. Reload the page to verify it persists!
  await page.reload();

  // 8. Verify it is STILL in the sidebar
  await expect(page.locator('.w-72.border-r').locator('text=TEST_DOC_123.pdf')).toBeVisible({ timeout: 15000 });

  console.log("E2E Test Passed: Document persisted after reload!");
});
