import { test, expect, type Page } from '@playwright/test';

// BH-72: on 25 Oct 2026 the repeated 01:00/01:30 (GMT) slots are labelled "GMT",
// in UK time even on a phone set to New York. NESO is mocked.
test.use({ serviceWorkers: 'block', timezoneId: 'America/New_York' });

const SLOT = 30 * 60_000;
const NOW = Date.parse('2026-10-24T23:50:00Z'); // 00:50 BST, Sun 25 Oct (London)

function row(fromMs: number, value: number) {
  return {
    from: new Date(fromMs).toISOString().replace(/:00\.000Z$/, 'Z'),
    to: new Date(fromMs + SLOT).toISOString().replace(/:00\.000Z$/, 'Z'),
    intensity: { forecast: value, actual: value, index: 'moderate' },
  };
}

async function mockNeso(page: Page) {
  const nowSlot = Math.floor(NOW / SLOT) * SLOT;
  await page.route('https://api.carbonintensity.org.uk/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/intensity') return route.fulfill({ json: { data: [row(nowSlot, 150)] } });
    if (path.startsWith('/intensity/')) {
      const rows = Array.from({ length: 96 }, (_, i) => row(nowSlot + (i - 2) * SLOT, 150 + i));
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
  test(`forecast chart labels repeated hour GMT at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.clock.install({ time: NOW });
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

    const gmt = page.getByRole('option', { name: /^01:00 GMT/ }).first();
    await expect(gmt).toBeAttached({ timeout: 20000 });
    await expect(page.getByRole('option', { name: /^01:30 GMT/ }).first()).toBeAttached();
    // First pass (BST) stays plain.
    await expect(page.getByRole('option', { name: /^01:00(?! GMT)/ }).first()).toBeAttached();
    await gmt.scrollIntoViewIfNeeded();
    // Label must not overflow its slot at small widths.
    const label = gmt.locator('span', { hasText: /^01:00\s*GMT$/ }).first();
    const box = await label.boundingBox();
    const slot = await gmt.boundingBox();
    console.log(`label ${box?.width}px in slot ${slot?.width}px`);
    expect(box!.width).toBeLessThanOrEqual(slot!.width + 1);
    // Table keeps a plain-text record too.
    await expect(page.getByRole('cell', { name: '25 Oct 2026, 01:30 GMT' })).toBeAttached();
    await page.screenshot({ path: `test-results/clock-change-labels-${viewport.width}.png` });
  });
}
