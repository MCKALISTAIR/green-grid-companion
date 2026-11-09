import { expect, test, type ViewportSize } from '@playwright/test';
import { IMPORT_METER, scenario, setup } from '../octopus-link.helpers';

const status = () => ({
  is_linked: true,
  has_credentials: true,
  api_key_hint: 'ab12',
  meters: [{ ...IMPORT_METER, id: 'm1', is_active: true, last_sync_at: '2026-10-01T06:00:00Z' }],
  latest_consumption: '2026-10-01T22:30:00+00:00',
  footprint_records: 1440,
});
const now = Date.now();
const footprint = {
  records: [
    {
      id: 'r1',
      interval_start: new Date(now - 2 * 86400000).toISOString(),
      interval_end: new Date(now - 2 * 86400000 + 1800000).toISOString(),
      consumption_kwh: 6,
      intensity_gco2_kwh: 50,
      carbon_g: 600,
      intensity_index: 'low',
      mpan: IMPORT_METER.mpan,
    },
    {
      id: 'r2',
      interval_start: new Date(now - 86400000).toISOString(),
      interval_end: new Date(now - 86400000 + 1800000).toISOString(),
      consumption_kwh: 6,
      intensity_gco2_kwh: 50,
      carbon_g: 600,
      intensity_index: 'low',
      mpan: IMPORT_METER.mpan,
    },
  ],
  summary: {
    total_carbon_kg: 1.2,
    total_kwh: 12,
    avg_intensity: 150,
    by_intensity_index: { low: { count: 2, carbon_g: 1200, kwh: 12 } },
    period_days: 2,
  },
};
const defaultViewport: ViewportSize = {
  width: Number(process.env.PHONE_WIDTH || 390),
  height: Number(process.env.PHONE_HEIGHT || 844),
};
const vpName = ({ width, height }: { width: number; height: number }) => `${width}x${height}`;

test('linked DESNZ car equivalent popover', async ({ page, context }) => {
  await page.setViewportSize(defaultViewport);
  await setup(
    page,
    context,
    scenario({
      status,
      seededStorage: {
        'gridgreen-achievements-v1': [
          { id: 'green_majority', unlocked: true },
          { id: 'eco_champion', unlocked: true },
          { id: 'ultra_green', unlocked: true },
          { id: 'low_carbon_day', unlocked: true },
          { id: 'data_tracker', unlocked: true },
        ],
      },
    }),
  );
  await context.route(/supabase\.co\/functions\/v1\/octopus-energy/, async (route) => {
    const { action } = route.request().postDataJSON();
    if (action !== 'get-footprint') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(footprint),
    });
  });
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('gridgreen-postcode')))
    .toBe('EH1');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'How clean is your power now?' })).toHaveCount(0);
  await page.locator('.home-feed').waitFor();
  await expect(page.locator('.home-scene-gauge')).toContainText('120');
  await page.getByRole('tab', { name: 'Footprint' }).click({ timeout: 60000 });
  const trigger = page.getByRole('button', { name: 'About the petrol car mileage comparison' });
  await expect(trigger).toBeVisible({ timeout: 30000 });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  await page
    .getByRole('button', { name: 'Close toast' })
    .evaluateAll((buttons) => buttons.forEach((button) => (button as HTMLButtonElement).click()));
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  const source = page.getByRole('link', { name: /DESNZ\/DEFRA 2025/ });
  await expect(source).toBeVisible();
  await expect(source).toHaveAttribute(
    'href',
    'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025',
  );
  await expect(
    page.getByText('DESNZ/DEFRA 2025, average petrol car: 0.26187 kg CO₂e/mile'),
  ).toBeVisible();
  const popover = page.locator(
    "[data-radix-popper-content-wrapper]:has(a[href*='conversion-factors-2025'])",
  );
  const bounds = await popover.boundingBox();
  await page.screenshot({
    path: `docs/polish/desnz-source/popover-${vpName(defaultViewport)}.png`,
    clip: {
      x: 0,
      y: Math.max(0, bounds!.y - 24),
      width: defaultViewport.width,
      height: Math.min(bounds!.height + 48, defaultViewport.height - Math.max(0, bounds!.y - 24)),
    },
  });
  await page.screenshot({
    path: `docs/polish/desnz-source/footprint-${vpName(defaultViewport)}.png`,
    fullPage: true,
  });
  await page.keyboard.press('Tab');
  await expect(source).toBeFocused();
});
