import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';
import { pinClocks, restoreNodeClock } from './support/pinClocks';

// BH-139: 215 g now gets the high scene (same band as the label), and the hero
// popover names Great Britain or "your region" honestly. Fully mocked, fixed clock.
//   PR_SHOTS=1 npx playwright test e2e/bh139-shots.spec.ts
test.skip(!process.env.PR_SHOTS, 'set PR_SHOTS=1 to capture docs/pr-shots/bh139');
test.use({ serviceWorkers: 'block' });
test.setTimeout(120_000);
test.afterEach(() => restoreNodeClock());

const OUT = 'docs/pr-shots/bh139';
const AT = '2026-10-29T12:10:00Z';
const PHONES = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];
const CELLS = [
  { slug: 'region-215g-popover', postcode: 'EH1 1YZ', text: 'your region' },
  { slug: 'gb-215g-popover', postcode: '', text: 'Great Britain' },
];

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.clock.runFor(4000);
  await page.mouse.move(1, 1);
}

for (const vp of PHONES) {
  for (const cell of CELLS) {
    test(`${cell.slug} ${vp.width}x${vp.height}`, async ({ page, context }) => {
      await page.setViewportSize(vp);
      await pinClocks(page, AT);
      await installMocks(context, { intensity: 215, index: 'high' });
      await context.addInitScript(seedStorage({ postcode: cell.postcode }));
      await context.addInitScript(() =>
        localStorage.setItem('gridgreen-scene-preference', 'countryside'),
      );
      await page.goto('/');
      if (!cell.postcode) {
        await page.getByRole('button', { name: 'Just show me the GB average' }).click();
      }
      await settle(page);
      await page.screenshot({
        path: `${OUT}/home-${cell.slug.replace('-popover', '')}-${vp.width}x${vp.height}.png`,
      });
      await page.getByRole('button', { name: 'What is carbon intensity?' }).click();
      await page.clock.runFor(800);
      await expect(page.getByText(`NESO's forecast for ${cell.text}`)).toBeVisible();
      await page.screenshot({ path: `${OUT}/${cell.slug}-${vp.width}x${vp.height}.png` });
    });
  }
}
