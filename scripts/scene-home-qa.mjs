import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const out = '/opt/cursor/artifacts/screenshots/scene-matrix';
fs.mkdirSync(out, { recursive: true });

const cases = [
  { theme: 'city', postcode: 'EC1A 1BB' },
  { theme: 'countryside', postcode: 'BA1 1AA' },
  { theme: 'coastal', postcode: 'PL1 1AA' },
];

const browser = await chromium.launch();

for (const { theme, postcode } of cases) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(({ theme, postcode }) => {
    localStorage.setItem('cookie-consent', 'declined');
    localStorage.setItem('cookie-consent-version', '2');
    localStorage.setItem('onboarding_complete', 'true');
    localStorage.setItem('product_tour_seen', 'true');
    localStorage.setItem('gridgreen-postcode', postcode);
    localStorage.setItem('gridgreen-scene-preference', theme);
  }, { theme, postcode });

  const page = await context.newPage();
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
  // Wait for intensity HUD number or scene
  await page.waitForTimeout(4000);
  // Dismiss any leftover overlays
  await page.evaluate(() => {
    document.querySelectorAll('[class*="cookie"], [class*="Cookie"], [data-tour]').forEach((el) => {
      if (el instanceof HTMLElement && /cookie|tour/i.test(el.className + (el.getAttribute('data-tour') || ''))) {
        el.style.display = 'none';
      }
    });
  });
  await page.screenshot({ path: path.join(out, `home-app-${theme}.png`), fullPage: false });
  const scene = page.locator('.home-scene').first();
  if (await scene.count()) {
    await scene.screenshot({ path: path.join(out, `home-app-${theme}-scene.png`) });
  } else {
    const img = page.locator('[role="img"]').first();
    if (await img.count()) await img.screenshot({ path: path.join(out, `home-app-${theme}-scene.png`) });
  }
  console.log('home-app', theme, page.url());
  await context.close();
}

await browser.close();
