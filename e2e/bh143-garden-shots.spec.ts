import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';
import { pinClocks, restoreNodeClock } from './support/pinClocks';

// BH-143: Home garden in a lush week (14 of 14 days low carbon) and a thin week
// (2 of 14). Fully mocked, fixed clock. Opt-in so normal runs never rewrite shots:
//   PR_SHOTS=1 npx playwright test e2e/bh143-garden-shots.spec.ts
test.skip(!process.env.PR_SHOTS, 'set PR_SHOTS=1 to capture docs/pr-shots/bh143');
test.use({ serviceWorkers: 'block' });
test.setTimeout(120_000);
test.afterEach(() => restoreNodeClock());

const OUT = 'docs/pr-shots/bh143';
const AT = '2026-10-29T12:10:00Z';
const PHONES = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 720, height: 540 },
];
const WEEKS = {
  lush: () => 60,
  thin: (day: number) => (day >= 12 ? 70 : 220),
} as const;

/** 14-day NESO range requests get one flat value per UK day; others use the shared mocks. */
async function mockGardenWindow(context: BrowserContext, perDay: (day: number) => number) {
  await context.route(/api\.carbonintensity\.org\.uk\/regional\/intensity\//, async (route) => {
    const m = new URL(route.request().url()).pathname.match(/intensity\/([^/]+)\/([^/]+)\//);
    const from = m ? Date.parse(decodeURIComponent(m[1])) : NaN;
    const to = m ? Date.parse(decodeURIComponent(m[2])) : NaN;
    if (!(to - from > 10 * 86_400_000)) return route.fallback();
    const data = [];
    for (let t = from, i = 0; t < to; t += 1_800_000, i++) {
      const v = perDay(Math.floor((t - from) / 86_400_000));
      const iso = (x: number) => new Date(x).toISOString().replace(/\.\d+Z$/, 'Z');
      data.push({
        from: iso(t),
        to: iso(t + 1_800_000),
        intensity: { forecast: v, actual: v, index: v < 90 ? 'low' : 'high' },
        generationmix: [],
      });
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { regionid: 2, shortname: 'South Scotland', data } }),
    });
  });
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.clock.runFor(4000);
  await page.mouse.move(1, 1);
}

for (const vp of PHONES) {
  for (const [week, perDay] of Object.entries(WEEKS)) {
    test(`garden ${week} ${vp.width}x${vp.height}`, async ({ page, context }) => {
      await page.setViewportSize(vp);
      await pinClocks(page, AT);
      await installMocks(context, { intensity: 75, index: 'low', flatSeries: true });
      await mockGardenWindow(context, perDay);
      await context.addInitScript(seedStorage());
      // The garden grows in the countryside scene (the city has no garden layer).
      await context.addInitScript(() =>
        localStorage.setItem('gridgreen-scene-preference', 'countryside'),
      );
      await page.goto('/');
      await settle(page);
      const line = page.getByText(/of 14 days low carbon/);
      await expect(line).toBeVisible({ timeout: 20_000 });
      await page.screenshot({ path: `${OUT}/home-garden-${week}-${vp.width}x${vp.height}.png` });
      await line.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.clock.runFor(800);
      await page.screenshot({
        path: `${OUT}/home-garden-${week}-line-${vp.width}x${vp.height}.png`,
      });
    });
  }
}
