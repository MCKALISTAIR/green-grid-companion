/**
 * Scene matrix QA — home context + theme×band×time captures.
 * Run: node scripts/scene-matrix-qa.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const out = '/opt/cursor/artifacts/screenshots/scene-matrix';
fs.mkdirSync(out, { recursive: true });

const THEMES = ['countryside', 'city', 'coastal'];
const BANDS = ['Very clean', 'Clean', 'Moderate', 'Dirty', 'Very dirty'];
const TIMES = ['midday', 'night'];

const browser = await chromium.launch();

async function dismissChrome(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[class*="cookie"], [class*="Cookie"]').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none';
    });
  });
}

// ——— HOME CONTEXT (fresh context per theme so preference sticks) ———
for (const theme of THEMES) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((t) => {
    localStorage.setItem('gridgreen-scene-preference', t);
  }, theme);
  const page = await context.newPage();
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
  await dismissChrome(page);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(out, `home-${theme}.png`), fullPage: false });
  // Crop to scene if present
  const scene = page.locator('.home-scene, [role="img"]').first();
  if (await scene.count()) {
    await scene.screenshot({ path: path.join(out, `home-${theme}-scene.png`) }).catch(() => {});
  }
  console.log('home', theme);
  await context.close();
}

// ——— SCENE-TEST MATRIX ———
const page2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page2.goto('http://localhost:8080/__scene-test', { waitUntil: 'networkidle' });
await dismissChrome(page2);

const preview = page2.getByLabel('iPhone SE viewport preview');

for (const theme of THEMES) {
  await page2.getByRole('button', { name: theme, exact: true }).click();
  await page2.waitForTimeout(500);
  for (const time of TIMES) {
    await page2.getByRole('button', { name: time, exact: true }).click();
    await page2.waitForTimeout(350);
    for (const band of BANDS) {
      await page2.getByRole('button', { name: band, exact: true }).click();
      await page2.waitForTimeout(800);
      await preview.scrollIntoViewIfNeeded();
      const slug = `${theme}-${time}-${band.toLowerCase().replace(/\s+/g, '-')}`;
      await preview.screenshot({ path: path.join(out, `${slug}.png`) });
      console.log('matrix', slug);
    }
  }
}

for (const label of ['Desktop', 'Ultrawide']) {
  await page2.getByRole('button', { name: 'city', exact: true }).click();
  await page2.getByRole('button', { name: 'Very clean', exact: true }).click();
  await page2.getByRole('button', { name: 'midday', exact: true }).click();
  await page2.waitForTimeout(700);
  const card = page2.getByLabel(`${label} viewport preview`);
  await card.scrollIntoViewIfNeeded();
  await card.screenshot({
    path: path.join(out, `aspect-${label.toLowerCase()}-city-very-clean.png`),
  });
  console.log('aspect', label);
}

await browser.close();
console.log('done →', out);
