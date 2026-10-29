import { test, expect } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

// BH-131: after a deploy the open tab's old lazy chunks are gone. Simulate it
// by 404ing the Glossary chunk once; the app should reload and show the page.
// Needs a production build (dev server has no hashed chunks), so it runs only
// when STALE_CHUNK_BASE_URL points at `vite preview`.
const base = process.env.STALE_CHUNK_BASE_URL;
test.skip(!base, 'set STALE_CHUNK_BASE_URL to a vite preview server');
test.use({ serviceWorkers: 'block' });

test('a missing lazy chunk after a deploy reloads once and recovers', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installMocks(context, { intensity: 150, index: 'moderate' });
  await context.addInitScript(seedStorage());
  let failed = 0;
  await context.route(/\/assets\/Glossary-[^/]+\.js$/, (r) => {
    if (failed++ === 0) return r.fulfill({ status: 404, body: 'gone' });
    return r.continue();
  });
  await page.goto(`${base}/`);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    window.history.pushState({}, '', '/glossary');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL(/\/glossary$/);
  await expect(page.getByRole('heading', { name: 'Energy Literacy' }).first()).toBeVisible({
    timeout: 20000,
  });
  expect(failed).toBeGreaterThanOrEqual(2);
});
