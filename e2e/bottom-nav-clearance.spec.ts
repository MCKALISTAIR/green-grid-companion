import { test, expect } from '@playwright/test';
import { checkScrollSpace } from '../scripts/layout/checks.mjs';

// Every page with the bottom nav, scrolled to the bottom, must keep its last
// content above the dock and must not scroll far past it.
//
// Chromium reports no iOS env inset: override the shared safe-area token to
// exercise both an ordinary mobile browser and the 34px home-indicator inset.
//
// BH-77: checkScrollSpace now jumps to the bottom instantly. html has
// `scroll-behavior: smooth`, so the old scrollTo had not moved yet when it
// measured, and any page taller than the screen "failed".

test.use({ serviceWorkers: 'block' });

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];

// The nav's tabs (Plan, History, Rank, Settings) plus the pages reached from
// them that keep the nav.
const ROUTES = [
  '/planner',
  '/history',
  '/map',
  '/settings',
  '/achievements',
  '/charging-history',
  '/locations',
  '/glossary',
  '/help',
  '/feature-guides',
  '/support',
  '/changelog',
  '/privacy',
  '/terms',
];

for (const viewport of VIEWPORTS) {
  for (const safeArea of [0, 34]) {
    test(`mobile content clears the dock at ${viewport.width}x${viewport.height} with ${safeArea}px safe area`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.evaluate(() => localStorage.setItem('product_tour_seen', 'true'));
      if (page.url().includes('/onboarding')) {
        await page.getByRole('button', { name: 'Just show me the GB average' }).click();
      }
      await expect(page.getByRole('tab', { name: 'Demand', exact: true })).toBeVisible();
      const decline = page.getByRole('button', { name: 'Decline', exact: true });
      await decline.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      if (await decline.isVisible()) await decline.click();
      await page.addStyleTag({ content: `:root { --bottom-safe-area: ${safeArea}px; }` });

      for (const view of ['Intensity', 'Demand', 'Footprint']) {
        await page.getByRole('tab', { name: view, exact: true }).click();
        await expect(page.getByRole('tabpanel', { name: view, exact: true })).toBeVisible();
        await page.waitForTimeout(1500);
        expect(await checkScrollSpace(page, { route: `/${view}`, viewport })).toEqual([]);
      }

      for (const route of ROUTES) {
        await page.goto(route);
        await expect(page.locator('main h1').first()).toBeVisible();
        await expect(page.getByTestId('bottom-nav')).toBeVisible();
        await page.addStyleTag({ content: `:root { --bottom-safe-area: ${safeArea}px; }` });
        await page.waitForTimeout(1500);
        expect(await checkScrollSpace(page, { route, viewport })).toEqual([]);
      }
    });
  }
}
