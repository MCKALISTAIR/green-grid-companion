import { test, expect } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

// #108 Design call: "We couldn't find {postcode}" / "Showing the GB average
// for now." + Fix postcode, which opens the location picker. Fully mocked.
test.use({ serviceWorkers: 'block' });

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`postcode not found at ${viewport.width}x${viewport.height}`, async ({ page, context }) => {
    await page.setViewportSize(viewport);
    await installMocks(context, { intensity: 150, index: 'moderate' });
    await context.route(/api\.carbonintensity\.org\.uk\/regional\/postcode\//, (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ error: { code: '400 Bad Request', message: 'Invalid postcode' } }),
      }),
    );
    await context.addInitScript(seedStorage({ postcode: 'ZZ9 9ZZ' }));
    await page.goto('/');
    const notice = page.getByTestId('postcode-not-found');
    await expect(notice).toBeVisible({ timeout: 20000 });
    await expect(notice).toContainText("We couldn't find ZZ9");
    await expect(notice).toContainText('Showing the GB average for now.');
    await notice.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/postcode-not-found-${viewport.width}.png` });
    await notice.getByRole('button', { name: 'Fix postcode' }).click();
    await expect(page.getByPlaceholder('Search postcode, town, or region...')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
}
