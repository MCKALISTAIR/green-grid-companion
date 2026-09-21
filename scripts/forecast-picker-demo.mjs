import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/opt/cursor/artifacts/forecast-picker';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  recordVideo: { dir: OUT, size: { width: 390, height: 844 } },
});
const page = await context.newPage();

await page.addInitScript(() => {
  localStorage.setItem('onboarding_complete', 'true');
  localStorage.setItem('gridgreen-postcode', 'SW1A 1AA');
  localStorage.setItem('cookie-consent', JSON.stringify({ essential: true, analytics: false }));
  localStorage.setItem('gridgreen-fact-prefs', 'friendly');
  // Suppress tour if gated on onboarding_complete alone — force tour seen if key exists
  localStorage.setItem('product_tour_completed', 'true');
  localStorage.setItem('driver-tour-completed', 'true');
});

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

// Dismiss overlays
for (const label of ['Skip', 'Got it', 'Close', 'Continue', 'Not now', 'Maybe later']) {
  const btn = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click().catch(() => {});
    await page.waitForTimeout(400);
  }
}

// Scroll forecast into view
const forecast = page.locator('[data-tour="forecast-chart"]');
await forecast.waitFor({ state: 'visible', timeout: 45000 });
await forecast.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);

const insight = page.locator('[data-testid="forecast-hour-insight"]');
await insight.waitFor({ state: 'visible', timeout: 15000 });

await page.screenshot({ path: `${OUT}/01-insight-default.png`, fullPage: false });

// Click a few hour buttons inside the forecast listbox
const hours = forecast.locator('[role="option"]');
const count = await hours.count();
console.log('hour options:', count);

if (count > 4) {
  await hours.nth(Math.min(6, count - 1)).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/02-insight-future-hour.png`, fullPage: false });
}

if (count > 10) {
  await hours.nth(Math.min(12, count - 1)).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/03-insight-later-hour.png`, fullPage: false });
}

// Jump to now
const jump = forecast.getByRole('button', { name: /jump to now/i });
if (await jump.isVisible().catch(() => false)) {
  await jump.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/04-insight-back-to-now.png`, fullPage: false });
}

const insightText = await insight.innerText();
console.log('insight text:\n', insightText);

await context.close();
await browser.close();
console.log('done');
