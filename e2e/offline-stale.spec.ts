import { test, expect, type Page } from '@playwright/test';

// BH-78 (Design call): offline with a cached reading over an hour old. The
// in-hero offline pill (#137) already says "Offline · figures from HH:MM", so
// the time is said once, in the pill: no "Last known" chip and no stale card,
// and the card's Retry moves onto the pill. Back online but still stale, the
// chip and card return. NESO is mocked; the service worker is blocked so the
// mock always applies. Nothing here hits a live service.
test.use({ serviceWorkers: 'block' });

const SLOT = 30 * 60_000;
function row(fromMs: number, value: number) {
  return {
    from: new Date(fromMs).toISOString().replace(/:00\.000Z$/, 'Z'),
    to: new Date(fromMs + SLOT).toISOString().replace(/:00\.000Z$/, 'Z'),
    intensity: { forecast: value, actual: value, index: 'moderate' },
  };
}

async function mockNeso(page: Page) {
  const nowSlot = Math.floor(Date.now() / SLOT) * SLOT;
  await page.route('https://api.carbonintensity.org.uk/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    // Latest reading is 90 minutes old (stale: over 60 min).
    if (path === '/intensity')
      return route.fulfill({ json: { data: [row(nowSlot - 3 * SLOT, 150)] } });
    if (path.startsWith('/intensity/')) {
      const rows = Array.from({ length: 100 }, (_, i) => row(nowSlot + (i - 2) * SLOT, 150));
      return route.fulfill({ json: { data: rows } });
    }
    if (path === '/generation') {
      return route.fulfill({
        json: {
          data: {
            from: row(nowSlot, 0).from,
            to: row(nowSlot, 0).to,
            generationmix: [{ fuel: 'wind', perc: 100 }],
          },
        },
      });
    }
    return route.fulfill({ json: { data: [] } });
  });
}

test('offline with a stale cached reading: pill only, at 390x844', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockNeso(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('product_tour_seen', 'true'));
  if (page.url().includes('/onboarding')) {
    await page.getByRole('button', { name: 'Just show me the GB average' }).click();
  }
  const decline = page.getByRole('button', { name: 'Decline', exact: true });
  await decline.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await decline.isVisible()) await decline.click();

  // Online and stale: the Last-known chip and the stale card are correct here.
  await expect(page.getByTestId('last-known-chip')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('stale-reading-notice')).toBeVisible();

  await context.setOffline(true);
  const pill = page.getByTestId('hero-status-slot').getByTestId('connection-pill');
  await expect(pill).toContainText('Offline · figures from');
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `test-results/bh78-offline-stale-390x844${process.env.SHOT_SUFFIX ?? ''}.png`,
  });

  // Exactly one message about the cached time: the pill, which carries Retry.
  await expect(page.getByTestId('connection-pill')).toHaveCount(1);
  await expect(page.getByTestId('last-known-chip')).toHaveCount(0);
  await expect(page.getByTestId('stale-reading-notice')).toHaveCount(0);
  await expect(page.getByTestId('offline-empty-state')).toHaveCount(0);
  const retry = pill.getByRole('button', { name: 'Retry' });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(1);

  // Back online, data still stale: the card and chip come back, the pill goes.
  await context.setOffline(false);
  await expect(page.getByTestId('stale-reading-notice')).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('last-known-chip')).toBeVisible();
  await expect(page.getByTestId('connection-pill')).toHaveCount(0, { timeout: 10000 });
});
