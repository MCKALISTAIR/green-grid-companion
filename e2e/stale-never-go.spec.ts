import { test, expect, type Page } from '@playwright/test';

// Keep the PWA service worker out of the way so the NESO mock always applies.
test.use({ serviceWorkers: 'block' });

// BH-59: a stale (6h old) low reading must never show a green "Now" on the
// now-or-wait card. NESO is mocked; nothing here hits a live service.
const SLOT = 30 * 60_000;

function row(fromMs: number, value: number) {
  return {
    from: new Date(fromMs).toISOString().replace(/:00\.000Z$/, 'Z'),
    to: new Date(fromMs + SLOT).toISOString().replace(/:00\.000Z$/, 'Z'),
    intensity: { forecast: value, actual: value, index: 'low' },
  };
}

async function mockNeso(page: Page) {
  const nowSlot = Math.floor(Date.now() / SLOT) * SLOT;
  await page.route('https://api.carbonintensity.org.uk/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/intensity') {
      // Stale: from 6 hours ago, very clean.
      return route.fulfill({ json: { data: [row(nowSlot - 12 * SLOT, 30)] } });
    }
    if (path.startsWith('/intensity/')) {
      const rows = Array.from({ length: 100 }, (_, i) => row(nowSlot + (i - 2) * SLOT, 40));
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

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`stale reading never shows "Now" at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockNeso(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('product_tour_seen', 'true'));
    if (page.url().includes('/onboarding')) {
      await page.getByRole('button', { name: 'Just show me the GB average' }).click();
    }
    const decline = page.getByRole('button', { name: 'Decline', exact: true });
    await decline.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await decline.isVisible()) await decline.click();

    const card = page.getByRole('region', { name: 'Now or wait decision' });
    await expect(card).toBeVisible({ timeout: 20000 });
    await expect(card).toContainText('Waiting for fresh data');
    await expect(card).not.toContainText("Now's good");
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-results/stale-never-go-${viewport.width}.png`,
    });
  });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`Planner: stale reading never shows "Now" at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockNeso(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('product_tour_seen', 'true'));
    if (page.url().includes('/onboarding')) {
      await page.getByRole('button', { name: 'Just show me the GB average' }).click();
    }
    await page.goto('/planner');
    const decline = page.getByRole('button', { name: 'Decline', exact: true });
    await decline.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await decline.isVisible()) await decline.click();
    await expect(page.getByText('Waiting for fresh data')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Now', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Any time', { exact: true })).toHaveCount(0);
    await page.getByText('Waiting for fresh data').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/stale-never-go-planner-${viewport.width}.png` });
  });
}
