// #104 Design call: main #133 full-width cloud drift; static under reduced motion.
import { test, expect } from '@playwright/test';
for (const [w, h] of [
  [390, 844],
  [320, 568],
]) {
  for (const rm of ['no-preference', 'reduce'] as const) {
    test(`clouds ${w} ${rm}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.emulateMedia({ reducedMotion: rm });
      await page.route('**/api.open-meteo.com/**', (r) =>
        r.fulfill({
          json: {
            current: {
              weather_code: 2,
              temperature_2m: 12,
              relative_humidity_2m: 70,
              wind_speed_10m: 5,
              cloud_cover: 60,
            },
          },
        }),
      );
      await page.goto('/__scene-test');
      // BH-94: the dev page's "clear" now matches live clear (cloud cover 5%,
      // so no clouds); pick partly-cloudy so there are clouds to measure.
      await page
        .getByRole('group', { name: 'Weather condition' })
        .getByRole('button', { name: 'partly-cloudy', exact: true })
        .click();
      const c = page.locator('[data-art-cloud]').first();
      await c.waitFor({ timeout: 20000 });
      const info = async () =>
        c.evaluate((el) => ({
          a: getComputedStyle(el).animationName,
          x: el.getBoundingClientRect().x,
        }));
      const a = await info();
      await page.waitForTimeout(1500);
      const b = await info();
      if (rm === 'reduce') {
        expect(a.a).toBe('none');
        expect(b.x).toBe(a.x);
      } else {
        expect(a.a).toBe('cloud-drift');
        expect(b.x).not.toBe(a.x);
      }
    });
  }
}
