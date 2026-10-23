import { test, expect, type Page, type Route } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';
import { checkCloudClearance } from '../scripts/layout/checks.mjs';

// BH-90 (Design ruling): with no weather data the scene shows the neutral
// overcast state (no sun, rain or wind effects) and keeps the time of day.
// Everything is mocked and the service worker is blocked.
test.use({ serviceWorkers: 'block' });

// A summer midday in London, so the old default would have drawn the sun.
const MIDDAY = new Date('2026-06-21T12:00:00+01:00');
const OPEN_METEO = /api\.open-meteo\.com/;

const WEATHER_EFFECTS = [
  '[data-scene-sun]',
  '[data-art="sun"]',
  '[data-art="rain"]',
  '[data-art="wind"]',
  '[data-art-wind]',
  '[data-art="fog"]',
].join(', ');

async function openHome(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('region', { name: /Animated landscape/ })).toBeVisible({
    timeout: 30_000,
  });
}

// Must match IDLE_TURBINE_SECONDS in src/lib/turbineSpeed.ts.
const IDLE_TURBINE_SECONDS = '20';

async function expectNeutralSky(page: Page) {
  const scene = page.getByRole('region', { name: /Animated landscape/ });
  await expect(scene.locator('[data-art="cloud-bank"]')).toHaveCount(1);
  await expect(scene.locator(WEATHER_EFFECTS)).toHaveCount(0);
  // Design review: no pale glow (the band halo reads as a sun behind cloud).
  await expect(scene.locator('[data-scene-halo]')).toHaveCount(0);
  // Every turbine on screen, of whatever kind, turns at the one idle speed.
  const speeds = await scene
    .locator('[data-turbine-seconds]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-turbine-seconds')));
  expect(new Set(speeds).size).toBeLessThanOrEqual(1);
  if (speeds.length > 0) expect(speeds[0]).toBe(IDLE_TURBINE_SECONDS);
}

// Near-white: every channel at or above this. The overcast sky's lightest
// rendered pixel is about rgb(201, 216, 231) at midday.
const NEAR_WHITE = 235;

/**
 * Design review (BH-90): the sky band above the cloud bank is a soft overcast
 * gradient with no white in it, the cloud tops stay clear of the hero text
 * (never above text bottom + 34), and nothing flies across the empty sky.
 */
async function expectOvercastHero(page: Page) {
  const scene = page.getByRole('region', { name: /Animated landscape/ });
  await expect(
    scene.locator('[data-art="cloud-bank"][data-variant="unknown-weather"]'),
  ).toHaveCount(1);
  await expect(scene.locator('[data-ambient]')).toHaveCount(0);

  const clearance = await checkCloudClearance(page);
  expect(clearance.failures).toEqual([]);

  // Sky band: scene top down to the cloud tops, with the hero text, chip and pill masked.
  const width = page.viewportSize()!.width;
  const bandHeight = Math.floor(clearance.cloudTop!);
  const masks = await page.locator('[data-testid="hero-text-block"] *').evaluateAll((els) =>
    els
      .filter((el) => {
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
        const tag = el.tagName.toLowerCase();
        // Text, icons, and anything with its own fill (chip, renewable pill).
        const fill = getComputedStyle(el).backgroundColor;
        const filled = fill !== 'rgba(0, 0, 0, 0)' && fill !== 'transparent';
        return own || tag === 'svg' || tag === 'button' || filled;
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return [r.left - 4, r.top - 4, r.right + 4, r.bottom + 4];
      }),
  );
  const png = await page.screenshot({ clip: { x: 0, y: 0, width, height: bandHeight } });
  // Decode on a blank page (no app CSP) and count near-white sky pixels.
  const blank = await page.context().newPage();
  const stats = await blank.evaluate(
    async ({ b64, masks, nearWhite, cssWidth }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, img.width, img.height);
      const scale = img.width / cssWidth;
      let white = 0;
      let total = 0;
      let first: number[] | null = null;
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          const cx = x / scale;
          const cy = y / scale;
          if (masks.some(([l, t, r, b]) => cx >= l && cx <= r && cy >= t && cy <= b)) continue;
          const i = (y * img.width + x) * 4;
          total++;
          if (data[i] >= nearWhite && data[i + 1] >= nearWhite && data[i + 2] >= nearWhite) {
            white++;
            first ??= [x, y, data[i], data[i + 1], data[i + 2]];
          }
        }
      }
      return { white, total, first };
    },
    { b64: png.toString('base64'), masks, nearWhite: NEAR_WHITE, cssWidth: width },
  );
  await blank.close();
  expect(stats.total).toBeGreaterThan(1000);
  expect(stats.white, `near-white sky pixel at ${JSON.stringify(stats.first)}`).toBe(0);
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`offline with an empty cache: neutral overcast, no sun or weather effects at ${viewport.width}x${viewport.height}`, async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);
    await page.clock.install({ time: MIDDAY });
    await page.setViewportSize(viewport);
    // Nothing answers, so nothing is cached; then the device goes offline.
    await installMocks(context, { mode: 'loading' });
    await page.route(OPEN_METEO, () => {});
    await context.addInitScript(seedStorage());
    await openHome(page);
    await context.setOffline(true);
    await page.waitForTimeout(2000);
    await expectNeutralSky(page);
    // Design review: offline, nothing can be loading. The hero says Offline and
    // the location chip shows its normal empty label; nothing spins.
    await expect(page.getByTestId('hero-number')).toContainText('Offline');
    await expect(page.getByText(/Loading/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Select location/ }).first()).toBeVisible();
    await expect(page.locator('.animate-spin:visible')).toHaveCount(0);
    await expectOvercastHero(page);
    await page.screenshot({
      path: `test-results/bh90-offline-empty-${viewport.width}x${viewport.height}.png`,
    });
    await context.setOffline(false);
  });
}

test('offline at night: the overcast sky darkens and the hero turns white', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  // 23:00 BST in October: night, and clear of the December Wrapped sheet.
  await page.clock.install({ time: new Date('2026-10-21T22:00:00Z') });
  await page.setViewportSize({ width: 390, height: 844 });
  await installMocks(context, { mode: 'loading' });
  await page.route(OPEN_METEO, () => {});
  await context.addInitScript(seedStorage());
  await openHome(page);
  await context.setOffline(true);
  await page.waitForTimeout(2500);
  await expectNeutralSky(page);
  await expect(page.getByTestId('hero-gauge')).toHaveAttribute('data-hero-tone', 'light');
  const skyTop = await page
    .getByRole('region', { name: /Animated landscape/ })
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  // Night overcast top is #232944, not the day grey-blue.
  expect(skyTop).toContain('rgb(35, 41, 68)');
  await expectOvercastHero(page);
  await context.setOffline(false);
});

test('online but the weather fetch failed: the same neutral overcast', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  await page.clock.install({ time: MIDDAY });
  await page.setViewportSize({ width: 390, height: 844 });
  await installMocks(context, { intensity: 150, index: 'moderate' });
  let calls = 0;
  await page.route(OPEN_METEO, (route) => {
    calls += 1;
    return route.fulfill({ status: 500, body: 'down' });
  });
  await context.addInitScript(seedStorage());
  await openHome(page);
  // The first try and both retries have failed.
  await expect.poll(() => calls, { timeout: 30_000 }).toBeGreaterThanOrEqual(3);
  await page.waitForTimeout(1500);
  await expectNeutralSky(page);
  await expectOvercastHero(page);
  await page.screenshot({ path: 'test-results/bh90-weather-failed-390x844.png' });
});

test('the normal scene resumes once real weather arrives', async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.clock.install({ time: MIDDAY });
  await page.setViewportSize({ width: 390, height: 844 });
  await installMocks(context, { intensity: 150, index: 'moderate' });
  const held: Route[] = [];
  await page.route(OPEN_METEO, (route) => {
    held.push(route);
  });
  await context.addInitScript(seedStorage());
  await openHome(page);
  await expect.poll(() => held.length, { timeout: 30_000 }).toBeGreaterThan(0);
  await expectNeutralSky(page);

  // Clear sky, light air: the sun comes back.
  for (const route of held.splice(0)) {
    await route.fulfill({
      json: {
        current: {
          temperature_2m: 20,
          relative_humidity_2m: 50,
          weather_code: 0,
          cloud_cover: 5,
          wind_speed_10m: 5,
        },
      },
    });
  }
  const scene = page.getByRole('region', { name: /Animated landscape/ });
  await expect(scene.locator('[data-scene-sun]')).toHaveCount(1, { timeout: 15_000 });
  await expect(scene.locator('[data-art="cloud-bank"]')).toHaveCount(0);
  await expect(scene.locator('[data-scene-halo]')).toHaveCount(1);
});

for (const sceneType of ['countryside', 'coastal'] as const) {
  test(`weather unknown: every ${sceneType} turbine turns at the one idle speed`, async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);
    await page.clock.install({ time: MIDDAY });
    await page.setViewportSize({ width: 390, height: 844 });
    await installMocks(context, { intensity: 60, index: 'low' });
    await page.route(OPEN_METEO, () => {}); // never answers
    await context.addInitScript(seedStorage());
    await context.addInitScript(
      `localStorage.setItem('gridgreen-scene-preference', ${JSON.stringify(sceneType)})`,
    );
    await openHome(page);
    const scene = page.getByRole('region', { name: /Animated landscape/ });
    const turbines = scene.locator('[data-turbine-seconds]');
    await expect.poll(() => turbines.count(), { timeout: 15_000 }).toBeGreaterThan(1);
    const speeds = await turbines.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-turbine-seconds')),
    );
    expect(new Set(speeds)).toEqual(new Set([IDLE_TURBINE_SECONDS]));
    await expectNeutralSky(page);
  });
}
