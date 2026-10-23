import { test, expect, type Route } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

// Design call on #128: the hero top row (New badge pill, location chip,
// GB-average dot) never wraps or truncates. At 320 the pill collapses to
// icon + count. Everything is mocked; nothing here hits a live service.
test.use({ serviceWorkers: 'block' });

const NW = { regionid: 3, dnoregion: 'Electricity North West', shortname: 'North West England' };

for (const viewport of [
  { width: 390, height: 844, compact: false },
  { width: 320, height: 568, compact: true },
]) {
  test(`hero top row fits at ${viewport.width}x${viewport.height}`, async ({ page, context }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installMocks(context, { intensity: 180, index: 'moderate' });
    // GB-average state: North West England loads with no figure, so the GB
    // number shows (BH-29). Registered after installMocks, so these win.
    const slot = new Date(Math.floor(Date.now() / 1800000) * 1800000);
    const iso = (d: Date) => d.toISOString().replace(/\.\d+Z$/, 'Z');
    const reading = {
      from: iso(slot),
      to: iso(new Date(slot.getTime() + 1800000)),
      intensity: { forecast: null, actual: null, index: 'moderate' },
      generationmix: [],
    };
    const fulfil = (route: Route, body: unknown) =>
      route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(body),
      });
    await context.route(/api\.carbonintensity\.org\.uk\/regional$/, (route) =>
      fulfil(route, {
        data: [{ from: reading.from, to: reading.to, regions: [{ ...NW, ...reading }] }],
      }),
    );
    await context.route(
      /api\.carbonintensity\.org\.uk\/regional\/(regionid\/\d+|postcode\/[^/]+)$/,
      (route) => fulfil(route, { data: [{ ...NW, data: [reading] }] }),
    );
    await context.addInitScript(seedStorage({ postcode: 'M1 1AE' }));
    await context.addInitScript(() => {
      localStorage.setItem(
        'gridgreen-achievements-v1',
        JSON.stringify([
          { id: 'data_tracker', unlocked: true, unlockedAt: new Date().toISOString(), progress: 1 },
        ]),
      );
    });
    await page.goto('/');

    const row = page.getByTestId('hero-location');
    const dot = row.getByTestId('regional-fallback-info');
    const pill = page.getByTestId('new-badge-pill');
    await expect(dot).toBeVisible({ timeout: 20000 });
    await expect(dot).toHaveAttribute('aria-label', /^North West England figure unavailable/);
    await expect(pill).toBeVisible();
    await page.waitForTimeout(800);

    // Location chip keeps its full name: no ellipsis.
    const chipText = row.locator('button span').first();
    expect(await chipText.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

    const chipBox = (await row.locator('button').first().boundingBox())!;
    const dotBox = (await dot.boundingBox())!;
    const pillBox = (await pill.boundingBox())!;
    // One line: chip, dot and pill share a row and nothing wraps.
    expect((await row.boundingBox())!.height).toBeLessThanOrEqual(48);
    for (const b of [dotBox, pillBox]) {
      expect(b.y).toBeLessThan(chipBox.y + chipBox.height);
      expect(b.y + b.height).toBeGreaterThan(chipBox.y);
    }
    // No overlap, everything on screen.
    expect(chipBox.x).toBeGreaterThanOrEqual(0);
    expect(chipBox.x + chipBox.width).toBeLessThanOrEqual(dotBox.x + 1);
    expect(dotBox.x + dotBox.width).toBeLessThanOrEqual(pillBox.x);
    expect(pillBox.x + pillBox.width).toBeLessThanOrEqual(viewport.width);
    // 44pt tap target either way.
    expect(pillBox.width).toBeGreaterThanOrEqual(44);
    expect(pillBox.height).toBeGreaterThanOrEqual(44);

    if (viewport.compact) {
      await expect(pill).toHaveAttribute('data-compact', 'true');
      await expect(pill).toHaveAttribute('aria-label', 'New badge, 1 unseen');
      await expect(pill).toHaveText('1');
    } else {
      await expect(pill).not.toHaveAttribute('data-compact', 'true');
      await expect(pill).toContainText('New badge');
    }
    await page.screenshot({ path: `test-results/hero-top-row-${viewport.width}.png` });
  });
}

test('regional state at 320: full "North West England" chip beside the compact pill', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await installMocks(context, {
    intensity: 180,
    index: 'moderate',
    regionName: 'North West England',
  });
  await context.addInitScript(seedStorage({}));
  await context.addInitScript(() => {
    localStorage.setItem(
      'gridgreen-achievements-v1',
      JSON.stringify([
        { id: 'data_tracker', unlocked: true, unlockedAt: new Date().toISOString(), progress: 1 },
      ]),
    );
  });
  await page.goto('/');
  const row = page.getByTestId('hero-location');
  await expect(row.getByText('North West England')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(800);
  const chipText = row.locator('button span').first();
  expect(await chipText.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  const chip = (await row.locator('button').first().boundingBox())!;
  const pill = page.getByTestId('new-badge-pill');
  const pillBox = (await pill.boundingBox())!;
  expect(chip.x + chip.width + 8).toBeLessThanOrEqual(pillBox.x);
  await expect(pill).toHaveAttribute('aria-label', 'New badge, 1 unseen');
  await page.screenshot({ path: 'test-results/hero-top-row-320-regional.png' });
});
