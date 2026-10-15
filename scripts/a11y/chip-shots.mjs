import { chromium } from 'playwright';
import { installMocks, seedStorage, SCENARIOS } from '../layout/mock-api.mjs';
const [base, prefix] = process.argv.slice(2);
const browser = await chromium.launch();
const times = {
  night: '2026-10-15T21:30:00+01:00',
  midday: '2026-10-15T12:30:00+01:00',
  sunset: '2026-10-15T18:15:00+01:00',
};
for (const vp of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
])
  for (const theme of ['light', 'dark'])
    for (const [t, iso] of Object.entries(times)) {
      if (vp.width === 320 && t !== 'night') continue;
      const ctx = await browser.newContext({
        viewport: vp,
        serviceWorkers: 'block',
        reducedMotion: 'reduce',
        deviceScaleFactor: 2,
      });
      await installMocks(ctx, SCENARIOS[Object.keys(SCENARIOS)[0]]);
      await ctx.addInitScript(seedStorage({ theme }));
      const page = await ctx.newPage();
      await page.clock.setFixedTime(new Date(iso));
      await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
      await page
        .waitForFunction(
          () => /gCO₂/.test(document.querySelector('.home-scene-gauge')?.textContent || ''),
          null,
          { timeout: 15000 },
        )
        .catch(() => {});
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: `shots/${prefix}-${vp.width}-${theme}-${t}.png`,
        clip: { x: 0, y: 0, width: vp.width, height: Math.min(360, vp.height) },
      });
      await ctx.close();
    }
await browser.close();
