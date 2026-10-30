import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage, SCENARIOS } from '../scripts/layout/mock-api.mjs';
import { DUO_VIEWPORTS } from './support/duoViewports';

// iPhone Duo layout guard (Design's cover-screen checklist), run by the duo-* projects:
// - no horizontal scroll on any screen
// - nothing covered: last content clears the bottom nav at scroll end; the hero
//   reading and band label sit above the sheet and the nav
// - tap targets 44px or larger (counting the .tap-target hit-area expansion)
// - tour tips 12px or more from every edge
// Insets are emulated from duoViewports.ts (estimates until real readings arrive).

const ROUTES = [
  '/',
  '/planner',
  '/history',
  '/map',
  '/settings',
  '/locations',
  '/achievements',
  '/help',
  '/glossary',
  '/feature-guides',
  '/changelog',
  '/charging-history',
  '/privacy',
  '/terms',
  '/does-not-exist',
];

async function setup(page: Page, projectName: string, opts: { tour?: boolean } = {}) {
  const v = DUO_VIEWPORTS.find((d) => d.id === projectName);
  if (v) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: v.insets });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installMocks(page.context(), SCENARIOS['zero-carbon']);
  await page.context().addInitScript(seedStorage({}));
  if (opts.tour)
    await page.context().addInitScript(() => localStorage.removeItem('product_tour_seen'));
}

for (const route of ROUTES) {
  test(`duo layout ${route}`, async ({ page }, info) => {
    test.setTimeout(60_000);
    await setup(page, info.project.name);
    await page.goto(route);
    await page.waitForTimeout(3500);

    const overflow = await page.evaluate(
      () => document.scrollingElement!.scrollWidth - window.innerWidth,
    );
    expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(1);

    const small = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>(
        'button, a[href], [role=tab], [role=switch], input, select',
      )) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (!r.width || !r.height || cs.visibility === 'hidden' || el.closest('[aria-hidden=true]'))
          continue;
        // Inline text links inside running text are exempt (WCAG 2.5.8 inline exception).
        if (el.tagName === 'A' && el.closest('p, li') && cs.display === 'inline') continue;
        let w = r.width;
        let h = r.height;
        const after = getComputedStyle(el, '::after');
        if (after.content !== 'none' && after.position === 'absolute') {
          w = Math.max(w, parseFloat(after.width) || 0);
          h = Math.max(h, parseFloat(after.height) || 0);
        }
        if (w < 43.5 || h < 43.5) {
          const label = (el.getAttribute('aria-label') || el.textContent || el.tagName)
            .trim()
            .slice(0, 40);
          out.push(`${label} (${Math.round(w)}x${Math.round(h)})`);
        }
      }
      return out;
    });
    expect(small, 'tap targets under 44px').toEqual([]);

    // At scroll end, no visible text in the viewport may sit under the bottom nav.
    const covered = await page.evaluate(async () => {
      window.scrollTo(0, document.scrollingElement!.scrollHeight);
      await new Promise((r) => setTimeout(r, 500));
      const nav = document.querySelector('#bottom-nav');
      if (!nav || getComputedStyle(nav).display === 'none') return [];
      const bar = nav.querySelector('[data-testid=bottom-nav]') ?? nav;
      const navTop = bar.getBoundingClientRect().top;
      const out: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || !(n.textContent || '').trim() || nav.contains(el)) continue;
        if (el.closest('[aria-hidden=true], .sr-only, [role=dialog], [data-sonner-toaster]'))
          continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.position === 'fixed') continue;
        if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const r = range.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (r.bottom <= 0 || r.top >= window.innerHeight) continue; // off screen
        // Clipped away by a scrolling or overflow-hidden ancestor: not visible.
        let clipped = false;
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const o = getComputedStyle(a);
          if (o.overflowY === 'visible' && o.overflowX === 'visible') continue;
          const ar = a.getBoundingClientRect();
          if (r.top >= ar.bottom - 1 || r.bottom <= ar.top + 1) clipped = true;
          if (clipped) break;
        }
        if (clipped) continue;
        if (r.bottom > navTop + 1)
          out.push(
            `${(n.textContent || '').trim().slice(0, 30)} (${Math.round(r.bottom)} > ${Math.round(navTop)})`,
          );
      }
      return out;
    });
    expect(covered, 'text under the bottom nav at scroll end').toEqual([]);

    if (route === '/') {
      const nav = page.locator('#bottom-nav');
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      const navTop = (await nav.isVisible())
        ? (await nav.boundingBox())!.y
        : (page.viewportSize()?.height ?? 0);
      for (const id of ['hero-number', 'hero-band-label']) {
        const box = await page.getByTestId(id).first().boundingBox();
        expect(box, id).not.toBeNull();
        expect(box!.y, `${id} below the top inset`).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height, `${id} above the nav`).toBeLessThanOrEqual(navTop);
      }
    }
  });
}

test('duo tour tips stay 12px from every edge', async ({ page }, info) => {
  test.setTimeout(120_000);
  await setup(page, info.project.name, { tour: true });
  await page.goto('/');
  const vp = page.viewportSize()!;
  const popover = page.locator('.driver-popover');
  await expect(popover).toBeVisible({ timeout: 30_000 });
  for (let step = 0; step < 12; step++) {
    await page.waitForTimeout(800);
    if (!(await popover.isVisible())) break;
    const title = await popover.locator('.driver-popover-title').innerText();
    const p = (await popover.boundingBox())!;
    expect(p.x, `${title}: left`).toBeGreaterThanOrEqual(12);
    expect(p.y, `${title}: top`).toBeGreaterThanOrEqual(12);
    expect(vp.width - (p.x + p.width), `${title}: right`).toBeGreaterThanOrEqual(12);
    expect(vp.height - (p.y + p.height), `${title}: bottom`).toBeGreaterThanOrEqual(12);
    const next = popover.getByRole('button', { name: /next|done|finish|got it/i });
    if (!(await next.count())) break;
    await next.first().click();
  }
});
