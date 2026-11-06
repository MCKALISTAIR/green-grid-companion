import { test, expect } from '@playwright/test';
import { installMocks, seedStorage, SCENARIOS } from '../scripts/layout/mock-api.mjs';

// G-08 (Design call): the forecast strip fades 16px at each edge with mask-image
// instead of a hard clip, and the "Best" chip stays inside its own column's width,
// above the bars, with no overlap at 320 and 382 wide.
test.use({ serviceWorkers: 'block' });

for (const [w, h] of [
  [320, 568],
  [382, 618],
] as const) {
  test(`forecast strip edge fade and Best chip at ${w}x${h}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: w, height: h },
      serviceWorkers: 'block',
      reducedMotion: 'reduce',
    });
    await installMocks(context, SCENARIOS['zero-carbon']);
    await context.addInitScript(seedStorage({}));
    const page = await context.newPage();
    await page.goto('/');
    const strip = page.getByTestId('forecast-strip');
    await expect(strip).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('best-window-chip').first()).toBeVisible();
    await strip.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    const mask = await strip.evaluate((el) => {
      const cs = getComputedStyle(el);
      return cs.maskImage || cs.getPropertyValue('-webkit-mask-image');
    });
    expect(mask).toContain('linear-gradient');
    expect(mask).toContain('16px');

    const geo = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="best-window-block"]')].map((block) => {
        const b = block.getBoundingClientRect();
        const chip = block
          .querySelector('[data-testid="best-window-chip"]')!
          .getBoundingClientRect();
        const row = block.parentElement!;
        const cols = [...row.querySelectorAll('button[data-slot-index]')]
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.right > b.left + 1 && r.left < b.right - 1);
        return {
          chipLeft: chip.left,
          chipRight: chip.right,
          chipBottom: chip.bottom,
          blockLeft: b.left,
          blockRight: b.right,
          colsTop: Math.min(...cols.map((r) => r.top)),
          chipWidth: chip.width,
        };
      }),
    );
    expect(geo.length).toBeGreaterThan(0);
    for (const g of geo) {
      expect(g.chipLeft).toBeGreaterThanOrEqual(g.blockLeft - 0.5);
      expect(g.chipRight).toBeLessThanOrEqual(g.blockRight + 0.5);
      // Above the columns (including the scaled-up selected column), no overlap.
      expect(g.chipBottom).toBeLessThanOrEqual(g.colsTop);
    }
    await context.close();
  });
}
