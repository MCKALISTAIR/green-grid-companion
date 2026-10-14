import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const out = '/opt/cursor/artifacts/screenshots';
fs.mkdirSync(out, { recursive: true });
const base = 'http://localhost:5173';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.addInitScript(() => {
  localStorage.setItem('gridgreen-scene-preference', 'city');
  localStorage.setItem('onboarding_complete', 'true');
  localStorage.setItem('gridgreen-postcode', 'EC1A');
  localStorage.setItem('cookie-consent', 'declined');
  localStorage.setItem('cookie-consent-version', '2');
  localStorage.setItem('skip_splash', 'true');
  localStorage.setItem('product_tour_seen', 'true');
  localStorage.removeItem('history-chart-tip-seen');
  localStorage.removeItem('green-score-tip-seen');
});
const page = await context.newPage();

await page.goto(`${base}/__scene-test`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'city', exact: true }).click();
await page.getByRole('button', { name: 'night', exact: true }).click();
await page.getByRole('button', { name: 'Very dirty', exact: true }).click();
await page.waitForTimeout(1400);
const preview = page.getByLabel('iPhone SE viewport preview');
await preview.scrollIntoViewIfNeeded();
await preview.screenshot({ path: path.join(out, 'city_night_very_dirty_windows.png') });
console.log('dirty night ok');

await page.getByRole('button', { name: 'Very clean', exact: true }).click();
await page.waitForTimeout(1400);
await preview.screenshot({ path: path.join(out, 'city_night_very_clean_windows_aurora.png') });
console.log('clean night ok');

await page.goto(`${base}/history`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, 'history_with_tip.png'), fullPage: false });
const tip = page.locator('text=Understanding the Graph').first();
if (await tip.count()) {
  await page
    .locator('text=Understanding the Graph')
    .locator(
      'xpath=ancestor::div[contains(@class,\"sheet-surface\") or contains(@class,\"Card\") or contains(@class,\"rounded\")][1]',
    )
    .screenshot({
      path: path.join(out, 'history_chart_tip.png'),
    })
    .catch(async () => {
      await page.screenshot({ path: path.join(out, 'history_chart_tip.png') });
    });
  console.log('history tip ok');
} else {
  console.log('history tip missing');
}

await page.goto(`${base}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
const fpTab = page.getByRole('tab', { name: /footprint/i });
if (await fpTab.count()) {
  await fpTab.click();
  await page.waitForTimeout(1200);
}
await page.screenshot({ path: path.join(out, 'home_footprint_unlock.png'), fullPage: false });
console.log('footprint ok');

await browser.close();
console.log('done');
