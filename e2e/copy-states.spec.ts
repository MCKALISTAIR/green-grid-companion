import { test, expect } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

// Design copy calls (BH-80, BH-87) at 390x844. Fully mocked; the service
// worker is blocked so the mocks always apply.
test.use({ serviceWorkers: 'block' });
const viewport = { width: 390, height: 844 };

test('hero: NESO not answering while online, "Offline" once offline (BH-80)', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize(viewport);
  await installMocks(context, { mode: 'error' });
  await context.addInitScript(seedStorage());
  await page.goto('/');
  const hero = page.getByTestId('hero-number');
  await expect(hero).toContainText("NESO isn't answering", { timeout: 60_000 });
  await expect(page.getByText('Data unavailable', { exact: true })).toHaveCount(0);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/bh80-hero-outage-online-390x844.png' });

  await context.setOffline(true);
  await expect(hero).toContainText('Offline');
  await expect(hero).not.toContainText("NESO isn't answering");
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/bh80-hero-offline-390x844.png' });
  await context.setOffline(false);
});

test('hero: neutral line when NESO answers but the data is unusable (BH-80)', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize(viewport);
  await installMocks(context, { intensity: 150, index: 'moderate' });
  // NESO answers 200, but with nothing we can read: a parse failure, not an outage.
  await page.route(/api\.carbonintensity\.org\.uk/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    }),
  );
  await context.addInitScript(seedStorage());
  await page.goto('/');
  const hero = page.getByTestId('hero-number');
  await expect(hero).toContainText('No reading right now', { timeout: 60_000 });
  await expect(hero).not.toContainText("NESO isn't answering");
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/bh80-hero-unavailable-390x844.png' });
});

test('Home notice for a BT postcode uses the all-island wording (BH-87)', async ({
  page,
  context,
}) => {
  await page.setViewportSize(viewport);
  await installMocks(context, { intensity: 150, index: 'moderate' });
  await context.addInitScript(seedStorage({ postcode: 'BT1 1AA' }));
  await page.goto('/');
  const notice = page.getByText('Northern Ireland is on the all-island grid', { exact: true });
  await expect(notice).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByText(/Northern Ireland (has|runs on) (its own|a separate) grid/),
  ).toHaveCount(0);
  await notice.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/bh87-ni-notice-390x844.png' });
});
