import { test, expect, type Page, type Route } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

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

async function expectNeutralSky(page: Page) {
  const scene = page.getByRole('region', { name: /Animated landscape/ });
  await expect(scene.locator('[data-art="cloud-bank"]')).toHaveCount(1);
  await expect(scene.locator(WEATHER_EFFECTS)).toHaveCount(0);
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
    await page.screenshot({
      path: `test-results/bh90-offline-empty-${viewport.width}x${viewport.height}.png`,
    });
    await context.setOffline(false);
  });
}

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
});
