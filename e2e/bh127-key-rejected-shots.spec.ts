import { test } from '@playwright/test';
import { IMPORT_METER, scenario, setup } from './octopus-link.helpers';

// BH-127 PR shots: Octopus answered 401 to the stored key (mocked; no real keys).
const DIR = 'docs/pr-shots/bh127-key-rejected';
const SIZES = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];
const status = () => ({
  is_linked: true,
  has_credentials: true,
  api_key_hint: 'ab12',
  meters: [
    {
      ...IMPORT_METER,
      id: 'm1',
      is_active: true,
      last_sync_at: '2026-08-21T06:00:00Z',
      last_sync_error: 'octopus_http_401',
      last_sync_error_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
    },
  ],
  latest_consumption: '2026-07-30T22:30:00+00:00',
  footprint_records: 1440,
});

for (const vp of SIZES) {
  test(`key rejected ${vp.width}x${vp.height}`, async ({ page, context }) => {
    await page.setViewportSize(vp);
    await setup(page, context, scenario({ status }));
    await page.goto('/settings');
    const el = page.getByTestId('octopus-key-rejected');
    await el.waitFor({ timeout: 120_000 });
    await el.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/settings-key-rejected-${vp.width}x${vp.height}.png` });
    await page.getByTestId('octopus-key-rejected-relink').click();
    await page.getByRole('dialog').waitFor({ timeout: 30_000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/relink-sheet-${vp.width}x${vp.height}.png` });
  });
}
