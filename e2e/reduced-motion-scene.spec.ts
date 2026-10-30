import { test, expect } from '@playwright/test';
import { installMocks, seedStorage, SCENARIOS } from '../scripts/layout/mock-api.mjs';

// Polish pass: with Reduce Motion on, the home scene still ran endless loops
// (sun-ray pulse, butterflies, wandering pigeons). Nothing should keep moving.
test.use({ serviceWorkers: 'block' });

for (const scenario of ['zero-carbon', 'very-high'] as const) {
  test(`home scene is still under reduced motion (${scenario})`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 382, height: 618 },
      serviceWorkers: 'block',
      reducedMotion: 'reduce',
    });
    await installMocks(context, SCENARIOS[scenario]);
    await context.addInitScript(seedStorage({}));
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForTimeout(6000);

    const looping = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity)
        .map((a) => (a.effect as KeyframeEffect).target?.getAttribute('class') ?? '?'),
    );
    expect(looping, 'endless animations').toEqual([]);

    const moving = await page.evaluate(async () => {
      const els = [...document.querySelectorAll('[style]')];
      const before = els.map((e) => e.getAttribute('style'));
      await new Promise((r) => setTimeout(r, 1500));
      return els
        .filter((e, i) => e.isConnected && e.getAttribute('style') !== before[i])
        .map((e) => (e.getAttribute('class') ?? e.tagName).slice(0, 60));
    });
    expect(moving, 'inline styles still changing').toEqual([]);
    await context.close();
  });
}
