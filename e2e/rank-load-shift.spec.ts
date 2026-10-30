import { test, expect } from '@playwright/test';
import { installMocks, seedStorage, SCENARIOS } from '../scripts/layout/mock-api.mjs';

// Polish pass: on first load the Rank map animated open from height 0, sliding
// the region list down (CLS 0.2-0.3 at every phone size, incl. the Duo cover).
// It now appears at full height; only a tap on the toggle animates it.
test.use({ serviceWorkers: 'block' });

for (const viewport of [
  { width: 320, height: 568 },
  { width: 382, height: 618 },
]) {
  test(`rank load shift stays small at ${viewport.width}x${viewport.height}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    await installMocks(context, SCENARIOS['zero-carbon']);
    await context.addInitScript(seedStorage({}));
    await context.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as {
          value: number;
          hadRecentInput: boolean;
        }[])
          if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const page = await context.newPage();
    await page.goto('/map');
    await expect(page.getByTestId('rank-map-frame')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThan(0.05);
    await context.close();
  });
}
