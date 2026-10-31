import { test, expect } from '@playwright/test';
import { installMocks, seedStorage, SCENARIOS } from '../scripts/layout/mock-api.mjs';

// Polish pass: on short screens (320x568, iPhone Duo cover 382x618) the hero
// grew by ~90-150px when the reading landed, pushing the sheet down (CLS 0.12).
// The loading hero now reserves the band label and the renewable pill.
test.use({ serviceWorkers: 'block' });

for (const viewport of [
  { width: 320, height: 568 },
  { width: 382, height: 618 },
]) {
  test(`home load shift stays small at ${viewport.width}x${viewport.height}`, async ({
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
    await page.goto('/');
    await expect(page.getByTestId('hero-meta')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThan(0.06);
    await context.close();
  });
}
