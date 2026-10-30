import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage, SCENARIOS } from '../scripts/layout/mock-api.mjs';

// D-07 (Design call): at 594x406 (iPhone Duo outer, landscape) Home is two
// columns. Scene + hero on the left (about 50%) with the band label and the
// renewable pill centred in that column; sheet + tabs on the right, scrolling
// on their own, with the tabs visible on first view. 951x620 keeps its
// two-column layout; portrait stays one column.
test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

const LANDSCAPE = { top: 0, bottom: 21, left: 59, right: 59 };

async function open(page: Page, width: number, height: number, scenario = 'zero-carbon') {
  await page.setViewportSize({ width, height });
  await installMocks(page.context(), SCENARIOS[scenario]);
  await page.context().addInitScript(seedStorage({}));
  if (width > height) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride' as never, { insets: LANDSCAPE } as never);
  }
  await page.goto('/');
  await expect(page.getByTestId('hero-meta')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(800);
}

const layout = (page: Page) =>
  page.evaluate(() => {
    const r = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
    const scene = r('.home-scene');
    const feed = r('.home-feed');
    const gauge = document.querySelector('.home-scene-gauge')!;
    const gs = getComputedStyle(gauge);
    const g = gauge.getBoundingClientRect();
    const contentMid =
      (g.left + parseFloat(gs.paddingLeft) + g.right - parseFloat(gs.paddingRight)) / 2;
    const mid = (x: DOMRect) => (x.left + x.right) / 2;
    const band = r('[data-testid="hero-band-label"]');
    const meta = r('[data-testid="hero-meta"]');
    const tabs = r('.home-feed [role="tablist"]');
    const nav = r('[data-testid="bottom-nav"]');
    return {
      vw: innerWidth,
      scene: { left: scene.left, right: scene.right, width: scene.width },
      feed: { left: feed.left, width: feed.width },
      contentMid,
      bandMid: mid(band),
      metaMid: mid(meta),
      meta: { left: meta.left, right: meta.right },
      tabs: { top: tabs.top, bottom: tabs.bottom },
      navTop: nav.top,
    };
  });

for (const scenario of ['zero-carbon', 'very-high']) {
  test(`594x406 two columns, ${scenario}`, async ({ page }) => {
    await open(page, 594, 406, scenario);
    const m = await layout(page);
    // About 50/50, side by side.
    expect(Math.abs(m.scene.width / m.vw - 0.5)).toBeLessThan(0.02);
    expect(m.scene.left).toBeLessThanOrEqual(1);
    expect(Math.abs(m.feed.left - m.scene.right)).toBeLessThanOrEqual(2);
    expect(Math.abs(m.feed.width / m.vw - 0.5)).toBeLessThan(0.02);
    // Band label and pill centred in the left column (its safe content box).
    expect(Math.abs(m.bandMid - m.contentMid)).toBeLessThanOrEqual(4);
    expect(Math.abs(m.metaMid - m.contentMid)).toBeLessThanOrEqual(4);
    expect(m.meta.left).toBeGreaterThanOrEqual(m.scene.left);
    expect(m.meta.right).toBeLessThanOrEqual(m.scene.right);
    // Tabs visible on first view, above the nav.
    expect(m.tabs.top).toBeGreaterThanOrEqual(0);
    expect(m.tabs.bottom).toBeLessThanOrEqual(m.navTop);

    // The sheet scrolls on its own; the page and the scene do not move.
    const before = await page.evaluate(() => ({
      y: scrollY,
      top: document.querySelector('.home-scene')!.getBoundingClientRect().top,
    }));
    const scrolled = await page.evaluate(() => {
      const feed = document.querySelector<HTMLElement>('.home-feed')!;
      feed.scrollTop = 300;
      return { st: feed.scrollTop, sh: feed.scrollHeight, ch: feed.clientHeight };
    });
    expect(scrolled.sh).toBeGreaterThan(scrolled.ch);
    expect(scrolled.st).toBeGreaterThan(0);
    await page.mouse.wheel(0, 0);
    const after = await page.evaluate(() => ({
      y: scrollY,
      top: document.querySelector('.home-scene')!.getBoundingClientRect().top,
    }));
    expect(after).toEqual(before);
  });
}

test('951x620 keeps its two columns', async ({ page }) => {
  await open(page, 951, 620);
  const m = await layout(page);
  expect(Math.abs(m.scene.width / m.vw - 0.48)).toBeLessThan(0.02);
  expect(Math.abs(m.feed.left - m.scene.right)).toBeLessThanOrEqual(2);
  expect(m.tabs.bottom).toBeLessThanOrEqual(m.navTop);
});

test('382x618 portrait stays one column', async ({ page }) => {
  await open(page, 382, 618);
  const m = await layout(page);
  expect(m.scene.width).toBeCloseTo(m.vw, 0);
  expect(m.feed.width).toBeCloseTo(m.vw, 0);
});
