import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

// BH-88 (Design call): offline, the pill says how old the figure is, so it
// shows the reading's own time (NESO's `from`, in UK time), not when the app
// saved it. Here the reading is from 07:00 BST and was saved at 08:30 BST.
// BH-89 (Design call): offline with nothing cached, the hero says "Offline"
// and the card keeps its body and Try now, with no "You're offline." title.
// NESO is mocked and the service worker is blocked so the mock always applies.
// Nothing here hits a live service.
test.use({ serviceWorkers: 'block' });

const SLOT = 30 * 60_000;
// 23 Oct 2026 08:30 BST (UTC+1).
const SAVED_AT = Date.UTC(2026, 9, 23, 7, 30);
// 23 Oct 2026 07:00 BST.
const READING_FROM = Date.UTC(2026, 9, 23, 6, 0);

function row(fromMs: number, value: number) {
  return {
    from: new Date(fromMs).toISOString().replace(/:00\.000Z$/, 'Z'),
    to: new Date(fromMs + SLOT).toISOString().replace(/:00\.000Z$/, 'Z'),
    intensity: { forecast: value, actual: value, index: 'moderate' },
  };
}

async function mockNeso(page: Page, readingFrom = READING_FROM) {
  const nowSlot = Math.floor(SAVED_AT / SLOT) * SLOT;
  await page.route('https://api.carbonintensity.org.uk/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/intensity') return route.fulfill({ json: { data: [row(readingFrom, 150)] } });
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

const shot = (name: string) => `test-results/${name}-390x844${process.env.SHOT_SUFFIX ?? ''}.png`;

test('BH-88: offline pill shows the reading time (07:00), not the save time (08:30)', async ({
  page,
  context,
}) => {
  await page.clock.install({ time: SAVED_AT });
  await page.setViewportSize({ width: 390, height: 844 });
  await mockNeso(page);
  await openHome(page);
  await expect(page.getByTestId('hero-status-slot')).toBeAttached({ timeout: 20000 });
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  const pill = page.getByTestId('hero-status-slot').getByTestId('connection-pill');
  await expect(pill).toContainText('Offline · figures from');
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot('bh88-offline-pill') });
  await expect(pill).toContainText('Offline · figures from 07:00');
  await expect(pill).not.toContainText('08:30');
  await expect(pill.getByRole('status')).toContainText('Offline. Reading from 07:00');
  await context.setOffline(false);
});

test('BH-88: a reading from yesterday says "Yesterday 07:00" (Design call, #178)', async ({
  page,
  context,
}) => {
  await page.clock.install({ time: SAVED_AT });
  await page.setViewportSize({ width: 390, height: 844 });
  // Thu 22 Oct 2026 07:00 BST, seen on Fri 23 Oct at 08:30 BST.
  await mockNeso(page, READING_FROM - 24 * 60 * 60_000);
  await openHome(page);
  await expect(page.getByTestId('hero-status-slot')).toBeAttached({ timeout: 20000 });
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  const pill = page.getByTestId('hero-status-slot').getByTestId('connection-pill');
  await expect(pill).toContainText('Offline · figures from Yesterday 07:00');
  await expect(pill.getByRole('status')).toContainText('Offline. Reading from yesterday at 07:00');
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot('bh88-offline-pill-yesterday') });
  await context.setOffline(false);
});

test('BH-89: offline with nothing cached says "Offline" once, in the hero', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  // NESO 500s, so nothing is ever cached and the hero reaches its error title.
  await installMocks(context, { mode: 'error' });
  await context.addInitScript(seedStorage());
  await page.goto('/');
  const hero = page.getByTestId('hero-number');
  await expect(hero.getByText(/Data unavailable|NESO isn't answering/)).toBeVisible({
    timeout: 60_000,
  });
  await context.setOffline(true);
  await expect(hero).toContainText('Offline');
  const card = page.getByTestId('offline-empty-state');
  await expect(card).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot('bh89-offline-empty') });
  await expect(card).not.toContainText("You're offline");
  await expect(card).toContainText('Nothing saved yet.');
  await expect(card).toContainText("We'll refresh automatically when you're back online.");
  await expect(card.getByRole('button', { name: 'Try now' })).toBeVisible();
  // Design call (#178): the icon is top-aligned with the first line of text.
  const icon = await card.locator('span[aria-hidden="true"]').first().boundingBox();
  const text = await card.locator('p').first().boundingBox();
  expect(Math.abs(icon!.y - text!.y)).toBeLessThanOrEqual(1);
  // One offline message on screen: the hero's.
  await expect(page.getByText(/offline/i).and(page.locator(':not(.sr-only)'))).toHaveCount(1);
  await expect(page.getByTestId('connection-pill')).toHaveCount(0);
  await context.setOffline(false);
});
