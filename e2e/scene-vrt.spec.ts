import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';
import { SCENE_TEST_WEATHER_LABELS } from '../src/lib/sceneTestWeather';

/**
 * Scene visual regression (BH-94). Reviewed baselines live in
 * e2e/__snapshots__/scene-vrt.spec.ts-snapshots/, so later scene PRs show a
 * real pixel diff.
 *
 * Deterministic by construction:
 * - Chromium only (the baselines are chromium-linux, Playwright 1.61).
 * - The service worker is blocked and every API is mocked.
 * - The clock is pinned and paused, then stepped forward so the intro fades
 *   finish and nothing moves between the two screenshots Playwright compares.
 * - Math.random is seeded, so birds, stars and particles land in the same place.
 * - Each case is set through the /__scene-test buttons (time, weather, intensity
 *   and theme), which now carry full weather flags.
 *
 * Update after a reviewed visual change:
 *   npx playwright test e2e/scene-vrt.spec.ts --project=chromium --update-snapshots
 */
test.use({ serviceWorkers: 'block' });

// Mobile first: 390, then 320 and 375 (the /__scene-test preview cards).
const PRESETS = [
  { name: 'iPhone-14', aria: 'iPhone 14' },
  { name: 'Small-phone', aria: 'Small phone' },
  { name: 'iPhone-SE', aria: 'iPhone SE' },
];

const CASES = [
  {
    label: 'very-clean-midday-clear',
    intensity: 'Very clean',
    time: 'midday',
    weather: 'clear',
    theme: 'countryside',
  },
  {
    label: 'moderate-sunset-partly-cloudy',
    intensity: 'Moderate',
    time: 'sunset',
    weather: 'partly-cloudy',
    theme: 'countryside',
  },
  {
    label: 'very-dirty-night-thunderstorm',
    intensity: 'Very dirty',
    time: 'night',
    weather: 'thunderstorm',
    theme: 'countryside',
  },
  {
    label: 'clean-dawn-fog',
    intensity: 'Clean',
    time: 'dawn',
    weather: 'fog',
    theme: 'countryside',
  },
  {
    label: 'moderate-dusk-rain-city',
    intensity: 'Moderate',
    time: 'dusk',
    weather: 'rain',
    theme: 'city',
  },
  {
    label: 'dirty-afternoon-overcast-city',
    intensity: 'Dirty',
    time: 'afternoon',
    weather: 'overcast',
    theme: 'city',
  },
  {
    label: 'clean-morning-snow-coastal',
    intensity: 'Clean',
    time: 'morning',
    weather: 'snow',
    theme: 'coastal',
  },
] as const;

// A fixed winter midday; the time buttons override the time of day.
const PINNED = new Date('2026-01-15T12:00:00Z');

async function seedRandom(page: Page) {
  await page.addInitScript(() => {
    let s = 0x2f6b9d1;
    Math.random = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
}

async function press(page: Page, group: string, name: string) {
  const button = page.getByRole('group', { name: group }).getByRole('button', {
    name,
    exact: true,
  });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

test.describe('Scene VRT', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'baselines are chromium-linux');

  for (const tc of CASES) {
    test(`scene ${tc.label}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await seedRandom(page);
      await installMocks(page.context(), {});
      await page.context().addInitScript(seedStorage());
      await page.clock.install({ time: PINNED });
      await page.clock.pauseAt(new Date(PINNED.getTime() + 1000));

      await page.goto('/__scene-test');
      await expect(page.getByRole('heading', { name: 'Scene test' })).toBeVisible({
        timeout: 30_000,
      });
      await press(page, 'Scene type', tc.theme);
      await press(page, 'Intensity state', tc.intensity);
      await press(page, 'Time of day', tc.time);
      await press(page, 'Weather condition', SCENE_TEST_WEATHER_LABELS[tc.weather]);
      // Let the intro and sky transitions finish on the paused clock.
      await page.clock.runFor(6000);

      for (const preset of PRESETS) {
        const preview = page.getByLabel(`${preset.aria} viewport preview`, { exact: true });
        await preview.scrollIntoViewIfNeeded();
        await expect(preview).toHaveScreenshot(`scene-${tc.label}-${preset.name}.png`, {
          animations: 'disabled',
          maxDiffPixelRatio: 0.01,
        });
      }
    });
  }
});

// Design copy review (23 Oct 2026): page copy and day-ordered times, checked at
// 390x844 and 320x568. Shots go to SCENE_COPY_SHOTS when set (PR evidence only).
test.describe('Scene test copy', () => {
  for (const [w, h] of [
    [390, 844],
    [320, 568],
  ] as const) {
    test(`copy at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await installMocks(page.context(), {});
      await page.context().addInitScript(seedStorage());
      await page.goto('/__scene-test');
      await expect(page.getByRole('heading', { name: 'Scene test', exact: true })).toBeVisible({
        timeout: 30_000,
      });
      await expect(page).toHaveTitle('Scene test: GridSense dev');
      const header = page.locator('header');
      await expect(header).toContainText('compared side by side');
      await expect(header).toContainText('responsive behaviour');
      await expect(header).toContainText(/Theme(?!:)/);
      await expect(page.locator('label[for="wind-slider"]')).toHaveText('Wind 5 m/s');
      await expect(
        page.getByRole('group', { name: 'Weather condition' }).getByRole('button', {
          name: 'Partly cloudy',
          exact: true,
        }),
      ).toBeVisible();
      const times = await page
        .getByRole('group', { name: 'Time of day' })
        .getByRole('button')
        .evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText.trim()));
      expect(times).toEqual(['Dawn', 'Morning', 'Midday', 'Afternoon', 'Sunset', 'Dusk', 'Night']);
      if (process.env.SCENE_COPY_SHOTS) {
        await header.screenshot({ path: `${process.env.SCENE_COPY_SHOTS}/189-copy-${w}x${h}.png` });
      }
    });
  }
});
