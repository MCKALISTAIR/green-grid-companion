/**
 * Stress-capture IntensityScene across theme × intensity × time.
 * Writes PNGs to /tmp/scene-stress/matrix/
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = '/tmp/scene-stress/matrix';
fs.mkdirSync(OUT, { recursive: true });

const THEMES = ['countryside', 'city', 'coastal'];
const INTENSITIES = ['Very clean', 'Moderate', 'Very dirty'];
const TIMES = ['midday', 'night', 'sunset'];

async function dismissChrome(page) {
  // Cookie banner
  const accept = page.getByRole('button', { name: /accept/i });
  if (await accept.count()) {
    try { await accept.first().click({ timeout: 2000 }); } catch { /* ignore */ }
  }
  // Google Lens / other overlays — Escape + hide common chrome
  await page.keyboard.press('Escape').catch(() => {});
  await page.addStyleTag({
    content: `
      [class*="cookie"], [id*="cookie"], [aria-label*="cookie" i],
      [class*="Lens"], [aria-label*="Lens" i] { display: none !important; }
    `,
  }).catch(() => {});
}

async function clickLabel(page, groupLabel, buttonText) {
  const group = page.getByRole('group', { name: groupLabel });
  const btn = group.getByRole('button', { name: buttonText, exact: true });
  await btn.click({ timeout: 10000 });
  await page.waitForTimeout(350);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:8080/__scene-test', { waitUntil: 'networkidle' });
  await dismissChrome(page);

  // Prefer native-size preview of iPhone 14 for scrutiny
  const scaleCheckbox = page.getByLabel(/Scale previews/i);
  if (await scaleCheckbox.isChecked()) {
    await scaleCheckbox.click();
  }

  for (const theme of THEMES) {
    await clickLabel(page, 'Scene type', theme === 'countryside' ? 'countryside' : theme);
    for (const intensity of INTENSITIES) {
      await clickLabel(page, 'Intensity state', intensity);
      for (const time of TIMES) {
        await clickLabel(page, 'Time of day', time);
        await page.waitForTimeout(800);

        const preview = page.locator('[aria-label*="iPhone 14 viewport preview"]').first();
        const file = path.join(
          OUT,
          `${theme}_${intensity.replace(/\s+/g, '-').toLowerCase()}_${time.toLowerCase()}.png`
        );
        if (await preview.count()) {
          await preview.screenshot({ path: file, animations: 'disabled' });
          console.log('wrote', file);
        } else {
          // Fallback: whole page crop of first scene card
          const card = page.locator('text=iPhone 14').first().locator('..').locator('..');
          await card.screenshot({ path: file, animations: 'disabled' });
          console.log('wrote-fallback', file);
        }
      }
    }
  }

  // Also capture dirty city thunderstorm + clean coastal dawn
  await clickLabel(page, 'Scene type', 'city');
  await clickLabel(page, 'Intensity state', 'Very dirty');
  await clickLabel(page, 'Time of day', 'night');
  await clickLabel(page, 'Weather condition', 'thunderstorm');
  await page.waitForTimeout(800);
  await page.locator('[aria-label*="iPhone 14 viewport preview"]').first()
    .screenshot({ path: path.join(OUT, 'city_very-dirty_night_thunderstorm.png') });

  await clickLabel(page, 'Scene type', 'coastal');
  await clickLabel(page, 'Intensity state', 'Clean');
  await clickLabel(page, 'Time of day', 'dawn');
  await clickLabel(page, 'Weather condition', 'clear');
  await page.waitForTimeout(800);
  await page.locator('[aria-label*="iPhone 14 viewport preview"]').first()
    .screenshot({ path: path.join(OUT, 'coastal_clean_dawn.png') });

  await browser.close();
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
