import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage, SCENARIOS } from '../scripts/layout/mock-api.mjs';

// BH-102 (Design): the scene paints no UI-chrome icons or warning chrome.
// The in-scene PollutionWarning (⚠, pulsing red border, red vignette, blurred
// particles) and the Lucide leaf/flame/droplet overlays are gone, with nothing
// in their place. Countryside (DN1, inland) is where the icons used to show.
// Everything is mocked and the service worker is blocked.
test.use({ serviceWorkers: 'block' });

const MIDDAY = new Date('2026-06-21T12:00:00+01:00');
// Set BH102_SHOTS=1 to write the PR screenshots into docs/pr-shots/bh102/.
const SHOTS = Boolean(process.env.BH102_SHOTS);

const BANDS = {
  'very-high': SCENARIOS['very-high'],
  'very-low': { intensity: 30, index: 'very low' },
} as const;

async function openCountryside(
  page: Page,
  band: keyof typeof BANDS,
  width: number,
  height: number,
) {
  await page.clock.install({ time: MIDDAY });
  await page.setViewportSize({ width, height });
  await installMocks(page.context(), BANDS[band]);
  await page.context().addInitScript(seedStorage({ postcode: 'DN1 1AA' }));
  await page.goto('/');
  const scene = page.getByRole('region', { name: /Animated landscape/ });
  await expect(scene).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2500); // let the intro fades settle
  return scene;
}

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  ...(SHOTS ? [{ width: 375, height: 667 }] : []),
];

for (const { width, height } of VIEWPORTS) {
  for (const band of Object.keys(BANDS) as (keyof typeof BANDS)[]) {
    test(`${band} countryside at ${width}x${height}: no chrome icons or warning chrome`, async ({
      page,
    }) => {
      const scene = await openCountryside(page, band, width, height);
      await expect(scene.locator('svg.lucide')).toHaveCount(0);
      await expect(scene.locator('.animate-leaf-float')).toHaveCount(0);
      await expect(scene.locator('[class*="border-red"]')).toHaveCount(0);
      await expect(scene.locator('[class*="red-900"]')).toHaveCount(0);
      await expect(scene.locator('path[fill="#ef4444"]')).toHaveCount(0);
      if (SHOTS) {
        await page.screenshot({
          path: `docs/pr-shots/bh102/bh102-${band}-${width}x${height}-after.png`,
        });
      }
    });
  }
}
