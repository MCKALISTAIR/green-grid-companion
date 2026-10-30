import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

/**
 * PR-2b (Design brief §3, Q5): carbon shows as haze and gas-plant smoke, by the
 * NESO band only. Very low and low (and no data) show no haze and no smoke; the
 * one gas plant is always there, and smoke only ever comes out of its stacks.
 *
 * Everything is mocked and the service worker is blocked. Set PR2B_SHOTS to a
 * directory to save the per-band shots (the PR's after shots).
 */
test.use({ serviceWorkers: 'block' });

const SHOTS = process.env.PR2B_SHOTS;
const MIDDAY = new Date('2026-06-21T12:00:00+01:00');
const NIGHT = new Date('2026-06-21T23:30:00+01:00');
const CLEAR = { weather_code: 0, cloud_cover: 0, wind_speed_10m: 8 };

const BANDS = [
  ['very low', 20, 'none', 0],
  ['low', 60, 'none', 0],
  ['moderate', 130, 'moderate', 3],
  ['high', 200, 'high', 5],
  ['very high', 340, 'very high', 6],
] as const;

const VIEWPORTS = [
  [390, 844],
  [320, 568],
  [375, 667],
] as const;

async function openAt(
  page: Page,
  { intensity, index, postcode = 'DN1', vw = 390, vh = 844, time = MIDDAY, isDay = 1 },
) {
  await page.clock.install({ time });
  await page.setViewportSize({ width: vw, height: vh });
  await installMocks(page.context(), {
    intensity,
    index,
    // Flat series at the NESO 2026 bands, so the mocked index matches bandFor() (#241).
    flatSeries: true,
    weather: { ...CLEAR, is_day: isDay },
  });
  await page.context().addInitScript(seedStorage({ postcode }));
  await page.goto('/');
  const scene = page.getByRole('region', { name: /Animated landscape/ });
  await expect(scene).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('hero-band-label')).toBeVisible({ timeout: 30_000 });
  return scene;
}

for (const [vw, vh] of VIEWPORTS) {
  for (const [index, intensity, band, puffs] of BANDS) {
    test(`${vw}x${vh} ${index}: haze ${band}, ${puffs} puffs per stack, smoke only from the plant`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const scene = await openAt(page, { intensity, index, vw, vh });
      await expect(scene).toHaveAttribute('data-scene-type', 'countryside');
      const plant = scene.locator('[data-art="gas-plant"]');
      await expect(plant).toHaveCount(1);
      await expect(plant).toBeVisible();
      await expect(plant).toHaveAttribute('data-smoke', band);
      const haze = scene.locator('[data-art="haze"]');
      if (band === 'none') {
        // The truth rule: nothing at all to see at very low and low.
        // The haze layer stays mounted (it measures the sky) but draws nothing.
        await expect(haze).toHaveAttribute('data-haze-band', 'none');
        await expect(haze.locator('*')).toHaveCount(0);
        await expect(scene.locator('[data-art="smoke"]')).toHaveCount(0);
        await expect(scene.locator('[data-smoke-puff]')).toHaveCount(0);
      } else {
        await expect(haze).toHaveAttribute('data-haze-band', band);
        // Two plumes, both inside the plant group.
        await expect(scene.locator('[data-art="smoke"]')).toHaveCount(2);
        await expect(plant.locator('[data-art="smoke"]')).toHaveCount(2);
        await expect(plant.locator('[data-smoke-puff]')).toHaveCount(puffs * 2);
        // Every puff sits within the plant's columns and above its roof.
        const pb = (await plant.locator('rect').first().boundingBox())!;
        const plantBox = (await plant.boundingBox())!;
        for (const puff of await plant.locator('[data-smoke-puff]').all()) {
          const b = await puff.boundingBox();
          if (!b) continue;
          expect(b.x).toBeGreaterThan(plantBox.x - 25);
          expect(b.x + b.width).toBeLessThan(plantBox.x + plantBox.width + 40);
          expect(b.y + b.height).toBeLessThanOrEqual(pb.y + 2);
        }
        if (band !== 'moderate') {
          // Design, 29 Oct 2026: a clearly visible column, at least 60 px tall at 390.
          const col = (await plant.locator('[data-smoke-column]').first().boundingBox())!;
          console.log(`smoke column ${vw}x${vh} ${band}: ${col.height.toFixed(1)}px`);
          if (vw >= 390) expect(col.height).toBeGreaterThanOrEqual(60);
        }
      }
      // Motion budget: transform/opacity only, no filters or blur on the new art.
      const filters = await scene
        .locator('[data-art="haze"], [data-art="haze"] *, [data-art="gas-plant"] *')
        .evaluateAll(
          (els) =>
            els.filter((el) => {
              const cs = getComputedStyle(el);
              return (
                (cs.filter && cs.filter !== 'none') ||
                el.hasAttribute('filter') ||
                (cs.backdropFilter && cs.backdropFilter !== 'none')
              );
            }).length,
        );
      expect(filters).toBe(0);
      if (SHOTS) {
        await page.waitForTimeout(2500);
        await page.screenshot({
          path: `${SHOTS}/after-${index.replace(' ', '-')}-${vw}x${vh}.png`,
          animations: 'disabled',
        });
      }
    });
  }
}

for (const [vw, vh] of [
  [390, 844],
  [320, 568],
] as const) {
  test(`${vw}x${vh} night very high: lighter horizon murk, aviation lights, underlit smoke`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const scene = await openAt(page, {
      intensity: 340,
      index: 'very high',
      time: NIGHT,
      isDay: 0,
      vw,
      vh,
    });
    await expect(scene).toHaveAttribute('data-time-of-day', 'night');
    const haze = scene.locator('[data-art="haze"]');
    await expect(haze).toHaveAttribute('data-haze-mode', 'glow');
    // The murk still draws after dark (Design, 29 Oct 2026).
    await expect(haze.locator('rect')).not.toHaveCount(0);
    await expect(scene.locator('[data-gas-plant-light]')).toHaveCount(2);
    await expect(scene.locator('[data-art="smoke"]')).toHaveCount(2);
    if (SHOTS) {
      // Let the data settle before the shot: no skeletons, stable layout.
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(4000);
      await page.screenshot({
        path: `${SHOTS}/after-very-high-night-${vw}x${vh}.png`,
        animations: 'disabled',
      });
    }
  });
}

test('Reduce Motion: 3 static puffs per stack at very high', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const scene = await openAt(page, { intensity: 340, index: 'very high' });
  await expect(scene.locator('[data-smoke-puff]')).toHaveCount(6);
  await expect(scene.locator('.art-smoke-puff')).toHaveCount(0);
});

test('city very high: haze, only the city gas plant (#241)', async ({ page }) => {
  test.setTimeout(90_000);
  const scene = await openAt(page, { intensity: 340, index: 'very high', postcode: 'EH1 1YZ' });
  await expect(scene).toHaveAttribute('data-scene-type', 'city');
  await expect(scene.locator('[data-art="haze"]')).toHaveAttribute('data-haze-band', 'very high');
  // Scene audit item 4 (#241): the city far layer has its own plant; no countryside one.
  await expect(scene.locator('[data-art="city-gas-plant"]')).toHaveCount(1);
  await expect(
    scene.locator('[data-art="gas-plant"]:not([data-art="city-gas-plant"] *)'),
  ).toHaveCount(0);
});
