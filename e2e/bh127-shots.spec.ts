import { test } from '@playwright/test';
import { IMPORT_METER, scenario, setup } from './octopus-link.helpers';

// BH-127 PR shots: linked meter whose newest reading is 30 Jul (live case) and a fresh one.
const DIR = 'docs/pr-shots/bh127';
const SIZES = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];
const status = (latest: string) => () => ({
  is_linked: true,
  has_credentials: true,
  api_key_hint: 'ab12',
  meters: [{ ...IMPORT_METER, id: 'm1', is_active: true, last_sync_at: '2026-08-21T06:00:00Z' }],
  latest_consumption: latest,
  footprint_records: 1440,
});

for (const vp of SIZES) {
  for (const [name, latest] of [
    ['stale', '2026-07-30T22:30:00+00:00'],
    ['fresh', new Date(Date.now() - 6 * 3600_000).toISOString()],
  ] as const) {
    test(`${name} ${vp.width}x${vp.height}`, async ({ page, context }) => {
      await page.setViewportSize(vp);
      await setup(page, context, scenario({ status: status(latest) }));
      await page.goto('/settings');
      const sel = name === 'stale' ? 'octopus-stale' : 'octopus-newest-reading';
      const el = page.getByTestId(sel).first();
      await el.waitFor({ timeout: 60_000 });
      await el.evaluate((e) => e.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${DIR}/settings-${name}-${vp.width}x${vp.height}.png` });
      if (name === 'stale') {
        await page.goto('/history');
        const h = page.getByTestId('octopus-stale-history');
        await h.waitFor({ timeout: 60_000 });
        await h.scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollBy(0, -200));
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${DIR}/history-stale-${vp.width}x${vp.height}.png` });
      }
    });
  }
}
