import { test, expect, type Page } from '@playwright/test';

// Design call (#137 + #146): offline with cached figures shows only the
// in-hero pill; offline with nothing cached shows only the full state.
// NESO is mocked; nothing here hits a live service.
test.use({ serviceWorkers: 'block' });

const SLOT = 30 * 60_000;
function row(fromMs: number, value: number) {
  return {
    from: new Date(fromMs).toISOString().replace(/:00\.000Z$/, 'Z'),
    to: new Date(fromMs + SLOT).toISOString().replace(/:00\.000Z$/, 'Z'),
    intensity: { forecast: value, actual: value, index: 'moderate' },
  };
}

async function mockNeso(page: Page, respond: boolean) {
  const nowSlot = Math.floor(Date.now() / SLOT) * SLOT;
  await page.route('https://api.carbonintensity.org.uk/**', async (route) => {
    if (!respond) return; // never answers: nothing gets cached
    const path = new URL(route.request().url()).pathname;
    if (path === '/intensity') return route.fulfill({ json: { data: [row(nowSlot, 150)] } });
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

async function openHome(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('product_tour_seen', 'true'));
  if (page.url().includes('/onboarding')) {
    await page.getByRole('button', { name: 'Just show me the GB average' }).click();
  }
  const decline = page.getByRole('button', { name: 'Decline', exact: true });
  await decline.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await decline.isVisible()) await decline.click();
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`offline with cached figures: pill only at ${viewport.width}`, async ({ page, context }) => {
    await page.setViewportSize(viewport);
    await mockNeso(page, true);
    await openHome(page);
    await expect(page.getByTestId('hero-status-slot')).toBeAttached({ timeout: 20000 });
    await page.waitForTimeout(1500);
    await context.setOffline(true);
    const pill = page.getByTestId('hero-status-slot').getByTestId('connection-pill');
    await expect(pill).toContainText('Offline · figures from');
    await expect(page.getByTestId('connection-pill')).toHaveCount(1);
    await expect(page.getByTestId('offline-empty-state')).toHaveCount(0);
    // Exactly one offline message: the pill (no card, chip or stale card too).
    await expect(page.getByText(/offline/i).and(page.locator(':not(.sr-only)'))).toHaveCount(1);
    await expect(page.getByTestId('last-known-chip')).toHaveCount(0);
    await expect(page.getByTestId('stale-reading-notice')).toHaveCount(0);
    await page.screenshot({ path: `test-results/offline-cached-${viewport.width}.png` });
    await context.setOffline(false);
  });

  test(`offline with nothing cached: full state only at ${viewport.width}`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize(viewport);
    await mockNeso(page, false);
    await openHome(page);
    await context.setOffline(true);
    const card = page.getByTestId('offline-empty-state');
    await expect(card).toBeVisible({ timeout: 20000 });
    // BH-89: no "You're offline." title; the hero says "Offline" once it errors.
    await expect(card).not.toContainText("You're offline");
    await expect(card).toContainText('Nothing saved yet.');
    // Try now must sit fully above the bottom nav, no scrolling, even at 320x568.
    const btn = await card.getByRole('button', { name: 'Try now' }).boundingBox();
    const nav = await page.locator('[data-testid="bottom-nav"], .nav-dock').first().boundingBox();
    expect(btn!.y + btn!.height).toBeLessThanOrEqual(nav!.y);
    await expect(page.getByTestId('connection-pill')).toHaveCount(0);
    // At most one offline message: the hero's "Offline" (none while it loads).
    expect(
      await page
        .getByText(/offline/i)
        .and(page.locator(':not(.sr-only)'))
        .count(),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/offline-empty-${viewport.width}.png` });
    await context.setOffline(false);
  });
}
