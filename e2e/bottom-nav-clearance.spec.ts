import { test, expect, type Page } from '@playwright/test';
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
//
// BH-118: under full-suite load a page could be measured while its content was
// still arriving (Demand at 320x568 showed ~590px of "empty scroll": the
// scroll height was already reserved, the content wasn't drawn yet). Each page
// now waits until its layout has settled (scroll height and last content edge
// unchanged across three reads 250ms apart), and the check itself is retried
// for up to 10s, so only a layout that stays wrong fails. Under the same load
// the Vite dev server sometimes failed a lazy route chunk ("Failed to fetch
// dynamically imported module"), which shows the error boundary instead of the
// page; that is a dev-server hiccup, not a layout result, so the route is
// reloaded (up to 3 tries) until its heading is up before anything is measured.

test.use({ serviceWorkers: 'block' });

/** Wait until the page's scroll height and lowest content edge stop changing (BH-118). */
async function waitForSettledLayout(page: Page) {
  let prev = '';
  let stable = 0;
  await expect
    .poll(
      async () => {
        const now = await page.evaluate(() => {
          const root = document.querySelector('main') || document.body;
          let last = 0;
          for (const el of root.querySelectorAll('*')) {
            const r = el.getBoundingClientRect();
            if (r.width >= 2 && r.height >= 2) last = Math.max(last, r.bottom + scrollY);
          }
          return `${document.scrollingElement!.scrollHeight}:${Math.round(last)}`;
        });
        stable = now === prev ? stable + 1 : 0;
        prev = now;
        return stable;
      },
      { timeout: 20_000, intervals: [250] },
    )
    .toBeGreaterThanOrEqual(2);
}

/** Open a route and wait for its heading, reloading if a lazy chunk failed to load (BH-118). */
async function gotoRoute(page: Page, route: string) {
  for (let attempt = 1; ; attempt++) {
    await page.goto(route);
    try {
      await expect(page.locator('main h1').first()).toBeVisible({ timeout: 15_000 });
      return;
    } catch (err) {
      if (attempt >= 3) throw err;
    }
  }
}

async function expectClearsDock(
  page: Page,
  route: string,
  viewport: { width: number; height: number },
) {
  await waitForSettledLayout(page);
  await expect
    .poll(() => checkScrollSpace(page, { route, viewport }), { timeout: 10_000, intervals: [500] })
    .toEqual([]);
}

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
        await expectClearsDock(page, `/${view}`, viewport);
      }

      for (const route of ROUTES) {
        await gotoRoute(page, route);
        await expect(page.getByTestId('bottom-nav')).toBeVisible();
        await page.addStyleTag({ content: `:root { --bottom-safe-area: ${safeArea}px; }` });
        await expectClearsDock(page, route, viewport);
      }
    });
  }
}
