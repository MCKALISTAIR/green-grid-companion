import { expect, test } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';
import { pinClocks, restoreNodeClock } from './support/pinClocks';

/** (c) The sunset sun's 46px disc stays clear of the hero's gCO2 unit and info icon. */
test.use({ serviceWorkers: 'block' });
test.afterEach(() => restoreNodeClock());

const SIZES = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 720, height: 540 },
];
const GAP = 8;

for (const vp of SIZES) {
  for (const g of [10, 300]) {
    test(`sunset sun clear of unit and info at ${vp.width}x${vp.height}, ${g}g`, async ({
      page,
      context,
    }) => {
      await page.setViewportSize(vp);
      await pinClocks(page, '2026-10-29T16:35:00Z');
      await installMocks(context, {
        intensity: g,
        index: g > 230 ? 'very high' : 'very low',
        weather: { weather_code: 0, cloud_cover: 5, wind_speed_10m: 10 },
        flatSeries: true,
      });
      await context.addInitScript(seedStorage({ postcode: 'DN1 1AA' }));
      await page.goto('/');
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.clock.runFor(4000);

      const hit = await page.locator('[data-scene-sun-hit]').boundingBox();
      const info = await page.locator('svg.lucide-info').first().boundingBox();
      const unit = await page.getByText(/^gCO/).first().boundingBox();
      expect(hit && info && unit).toBeTruthy();
      const cx = hit!.x + hit!.width / 2;
      const cy = hit!.y + hit!.height / 2;
      const disc = { x: cx - 23, y: cy - 23, width: 46, height: 46 };
      for (const b of [info!, unit!]) {
        const gap = Math.max(
          b.x - (disc.x + disc.width),
          disc.x - (b.x + b.width),
          b.y - (disc.y + disc.height),
          disc.y - (b.y + b.height),
        );
        expect(gap).toBeGreaterThanOrEqual(GAP);
      }
      expect(disc.x + disc.width).toBeLessThanOrEqual(vp.width);
    });
  }
}
