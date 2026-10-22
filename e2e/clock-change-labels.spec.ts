import { test, expect, type Page } from '@playwright/test';

// BH-72: on 25 Oct 2026 the repeated 01:00/01:30 slots are tagged BST (first) and GMT (second),
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

    const names = [
      '1 am BST, before the clocks went back',
      '1:30 am BST, before the clocks went back',
      '1 am GMT, after the clocks went back',
      '1:30 am GMT, after the clocks went back',
    ];
    for (const name of names) {
      const slot = page
        .getByRole('option', {
          name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
        })
        .first();
      await expect(slot).toBeAttached({ timeout: 20000 });
      await slot.scrollIntoViewIfNeeded();
      const zone = name.includes('BST') ? 'BST' : 'GMT';
      const time = name.startsWith('1:30') ? '01:30' : '01:00';
      // Visible label is "01:00" + small tag; it must fit its 48px slot.
      const label = slot.locator('span', { hasText: new RegExp(`^${time}\\s*${zone}$`) }).first();
      await expect(label).toBeVisible();
      const box = await label.boundingBox();
      const slotBox = await slot.boundingBox();
      console.log(`${time} ${zone}: label ${box?.width}px in slot ${slotBox?.width}px`);
      expect(box!.width).toBeLessThanOrEqual(slotBox!.width + 1);
    }
    await page
      .getByRole('option', { name: /^1 am BST/ })
      .first()
      .scrollIntoViewIfNeeded();
    // Table keeps a plain-text record too.
    await expect(page.getByRole('cell', { name: '25 Oct 2026, 01:30 GMT' })).toBeAttached();
    await page.screenshot({ path: `test-results/clock-change-labels-${viewport.width}.png` });
  });
}
