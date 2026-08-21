const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to app...");
  await page.goto('http://localhost:3000');

  // Login
  await page.click('button:has-text("Se connecter"), button:has-text("LOGIN")');
  await page.fill('input[type="email"], input[type="text"]', 'test1@enset.ma');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("CONNECT TO NODE"), button:has-text("Login")');

  console.log("Logged in, waiting for ADD DOCUMENT button...");
  await page.waitForSelector('button:has-text("ADD DOCUMENT")');

  // Intercept the file chooser
  console.log("Clicking ADD DOCUMENT...");
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button:has-text("ADD DOCUMENT")')
  ]);

  console.log("File chooser opened successfully!");

  await browser.close();
  console.log("E2E Test Passed!");
})();
