import { test, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';
import { pinClocks, restoreNodeClock } from './support/pinClocks';

/**
 * Full home hero over each village scene variant, with NESO, weather and
 * location all mocked and the clock pinned. For checking hero text readability.
 *
 *   PR_SHOTS=1 npx playwright test e2e/scene-hero-shots.spec.ts --project=chromium
 *
 * Optional env:
 *   HERO_OUT     output folder (default test-results/hero-shots)
 *   HERO_FILTER  regex on the cell slug, e.g. "city-edinburgh-.*-300g" or "night"
 *   HERO_SIZES   "390x844,320x568" (default both)
 */
test.skip(!process.env.PR_SHOTS, 'set PR_SHOTS=1 to capture hero shots');
test.use({ serviceWorkers: 'block' });
test.setTimeout(120_000);
test.afterEach(() => restoreNodeClock());

const OUT = process.env.HERO_OUT || 'test-results/hero-shots';
const FILTER = new RegExp(process.env.HERO_FILTER || '.');
const SIZES = (process.env.HERO_SIZES || '390x844,320x568').split(',').map((s) => {
  const [width, height] = s.split('x').map(Number);
  return { width, height };
});

const BANDS = [
  { g: 10, index: 'very low' },
  { g: 60, index: 'low' },
  { g: 130, index: 'moderate' },
  { g: 200, index: 'high' },
  { g: 300, index: 'very high' },
];
// UK time is UTC+0 on these dates.
const TIMES = [
  { name: 'midday', at: '2026-10-29T12:10:00Z' },
  { name: 'sunset', at: '2026-10-29T16:35:00Z' },
  { name: 'night', at: '2026-10-29T22:10:00Z' },
];
const EDINBURGH = {
  postcode: 'EH1 1YZ',
  outcode: 'EH1',
  latitude: 55.95,
  longitude: -3.19,
  admin_district: 'City of Edinburgh',
  region: null,
  country: 'Scotland',
};
const LONDON = {
  postcode: 'SW1A 1AA',
  outcode: 'SW1A',
  latitude: 51.501,
  longitude: -0.142,
  admin_district: 'Westminster',
  region: 'London',
  country: 'England',
};
const DONCASTER = {
  postcode: 'DN1 1AA',
  outcode: 'DN1',
  latitude: 53.522,
  longitude: -1.133,
  admin_district: 'Doncaster',
  region: 'Yorkshire and The Humber',
  country: 'England',
};
const PLACES = [
  { name: 'country', place: DONCASTER, pref: 'countryside', region: 'Yorkshire' },
  { name: 'city-edinburgh', place: EDINBURGH, pref: 'city', region: 'South Scotland' },
  { name: 'city-london', place: LONDON, pref: 'city', region: 'London' },
  { name: 'coastal', place: EDINBURGH, pref: 'coastal', region: 'South Scotland' },
];
const WEATHER = [
  { name: 'clear', w: { weather_code: 0, cloud_cover: 5, wind_speed_10m: 36 } },
  { name: 'cloudy', w: { weather_code: 2, cloud_cover: 45, wind_speed_10m: 18 } },
];

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.clock.runFor(4000);
  await page.mouse.move(1, 1);
}

for (const vp of SIZES) {
  for (const place of PLACES) {
    for (const time of TIMES) {
      for (const wx of WEATHER) {
        for (const band of BANDS) {
          const slug = `${place.name}-${time.name}-${wx.name}-${band.g}g`;
          if (!FILTER.test(slug)) continue;
          test(`${slug} ${vp.width}x${vp.height}`, async ({ page, context }) => {
            await page.setViewportSize(vp);
            await pinClocks(page, time.at);
            await installMocks(context, {
              intensity: band.g,
              index: band.index,
              weather: wx.w,
              flatSeries: true,
              place: place.place,
              regionName: place.region,
            });
            await context.addInitScript(seedStorage({ postcode: place.place.postcode }));
            await context.addInitScript(
              (pref) => localStorage.setItem('gridgreen-scene-preference', pref),
              place.pref,
            );
            await page.goto('/');
            await settle(page);
            await page.screenshot({ path: `${OUT}/${slug}-${vp.width}x${vp.height}.png` });
          });
        }
      }
    }
  }
}
