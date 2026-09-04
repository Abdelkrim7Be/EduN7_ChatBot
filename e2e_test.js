// Smoke test: sign in and confirm the chat workspace is usable.
// Run with: NODE_PATH=$PWD/node_modules node e2e_test.js
const { chromium } = require('playwright');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'admin@enset.ma';
const PASSWORD = process.env.E2E_PASSWORD || 'Password123!';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Opening the login page...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  console.log('Waiting for the chat workspace...');
  await page.waitForSelector('textarea:not([disabled])', { timeout: 20000 });

  // The session token must never be reachable from JavaScript.
  const storage = await page.evaluate(() => Object.keys(localStorage));
  if (storage.some((k) => k === 'ensetai_token')) {
    throw new Error('Session token found in localStorage — it must stay in an httpOnly cookie');
  }

  console.log('Opening the file chooser...');
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button:has-text("Ajouter un document")'),
  ]);
  if (!fileChooser) throw new Error('File chooser did not open');

  await browser.close();
  console.log('E2E smoke test passed.');
})().catch((err) => {
  console.error('E2E smoke test failed:', err.message);
  process.exit(1);
});
