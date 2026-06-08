const { chromium } = require('@playwright/test');

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[BROWSER ERROR]`, err);
  });

  console.log("Navigating to app...");
  await page.goto('http://localhost:8080/settings');
  
  // Wait a bit to let it load and try to resolve
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log("Done.");
})();
