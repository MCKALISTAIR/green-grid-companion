import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';
import { pinClocks, restoreNodeClock } from './support/pinClocks';

// Garden stage-up pill (Design, 30 Oct 2026): visible on first load, pinned just
// under the hero, never over the hero, the scene or the 'Now or wait' card, no
// layout shift when it appears or goes, and never in the city scene.
// 14-day garden window mocked as 12 low days (40 g) and 2 high (200 g): stage 3.
// GARDEN_SHOTS=<dir> also writes screenshots.
test.use({ serviceWorkers: 'block' });
test.afterEach(() => restoreNodeClock());
test.setTimeout(90_000);

const iso = (t: number) => new Date(t).toISOString().replace(/\.\d+Z$/, 'Z');

/** Mock the garden's 14-day fetch; returns a release() so a spec can hold it back. */
async function mockGarden(page: Page) {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.context().route(/regional\/intensity\/[^/]+\/[^/]+\/regionid\/\d+/, async (route) => {
    const m = route
      .request()
      .url()
      .match(/intensity\/([^/]+)\/([^/]+)\/regionid/)!;
    const from = Date.parse(decodeURIComponent(m[1]));
    const to = Date.parse(decodeURIComponent(m[2]));
    if (to - from < 10 * 86400000) return route.fallback();
    await gate;
    const data = [];
    for (let t = from; t < to; t += 1800000) {
      const day = Math.floor((t - from) / 86400000);
      const v = day === 3 || day === 9 ? 200 : 40;
      data.push({
        from: iso(t),
        to: iso(t + 1800000),
        intensity: { forecast: v, actual: v, index: 'low' },
        generationmix: [{ fuel: 'wind', perc: 100 }],
      });
    }
    return route.fulfill({
      json: { data: { regionid: 2, shortname: 'South Scotland', data } },
    });
  });
  return release;
}

async function open(
  page: Page,
  vp: { width: number; height: number },
  postcode: string,
  at: string,
) {
  await pinClocks(page, at);
  await page.setViewportSize(vp);
  await installMocks(page.context(), { intensity: 60, index: 'low' });
  const release = await mockGarden(page);
  await page.context().addInitScript(seedStorage({ postcode }));
  await page.goto('/');
  await expect(page.locator('[data-tour="now-or-wait"]')).toBeVisible({ timeout: 30_000 });
  return release;
}

const rect = (page: Page, sel: string) =>
  page
    .locator(sel)
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom) };
    });

const SIZES = [
  { width: 382, height: 618, name: 'duo' },
  { width: 390, height: 844, name: '390' },
  { width: 320, height: 568, name: '320' },
];
const shots = process.env.GARDEN_SHOTS;
const snap = async (page: Page, n: string) => {
  if (!shots) return;
  const { width, height } = page.viewportSize()!;
  await page.screenshot({ path: `${shots}/home-garden-pill-${n}-${width}x${height}.png` });
};

for (const vp of SIZES) {
  for (const s of [
    { scene: 'day', at: '2026-10-30T12:00:00Z' },
    { scene: 'night', at: '2026-10-30T22:00:00Z' },
  ]) {
    test(`${s.scene} ${vp.width}x${vp.height}: on screen, clear of hero/scene/card, no shift`, async ({
      page,
    }) => {
      const release = await open(page, vp, 'DN1 1AA', s.at);
      await page.waitForTimeout(1500);
      const card0 = await rect(page, '[data-tour="now-or-wait"]');
      const body0 = await rect(page, '.home-feed-body');
      release();
      const pill = page.getByTestId('scene-garden-stage-up');
      await expect(pill).toBeVisible({ timeout: 20_000 });
      await expect
        .poll(() => pill.evaluate((el) => Number(getComputedStyle(el).opacity)))
        .toBeGreaterThan(0.99);
      await expect(pill).toHaveText('Garden is lush · 12 of 14 days low carbon');

      const p = await rect(page, '[data-testid="scene-garden-stage-up"]');
      const hero = await rect(page, '[data-testid="hero-text-block"]');
      const feed = await rect(page, '.home-feed');
      const card = await rect(page, '[data-tour="now-or-wait"]');
      console.log(vp.name, s.scene, JSON.stringify({ pill: p, hero, feedTop: feed.top, card }));
      expect(p.top).toBeGreaterThanOrEqual(0); // on screen on first load, no scrolling
      expect(p.bottom).toBeLessThanOrEqual(vp.height);
      expect(p.top).toBeGreaterThanOrEqual(hero.bottom); // below the hero reading
      expect(p.top).toBeGreaterThanOrEqual(feed.top); // on the sheet, not over the scene
      expect(p.bottom).toBeLessThanOrEqual(card.top); // clear of 'Now or wait'
      expect(await rect(page, '[data-tour="now-or-wait"]')).toEqual(card0); // no shift on show
      expect(await rect(page, '.home-feed-body')).toEqual(body0);
      // The copy is never cut off.
      const cut = await page
        .getByTestId('scene-garden-stage-up-text')
        .evaluate((el) => el.scrollWidth > el.clientWidth);
      expect(cut).toBe(false);
      const next = await page
        .locator('.home-feed > :not(.absolute):not(.pointer-events-none)')
        .evaluateAll((els) =>
          Math.min(
            ...els
              .map((e) => e.getBoundingClientRect())
              .filter((r) => r.height > 12)
              .map((r) => Math.round(r.top)),
          ),
        );
      console.log(vp.name, s.scene, 'gap to next block', next - p.bottom);
      expect(next - p.bottom).toBeGreaterThanOrEqual(8);
      await snap(page, s.scene);

      await pill.click();
      await expect(pill).toBeHidden();
      expect(await rect(page, '[data-tour="now-or-wait"]')).toEqual(card0); // no shift on hide
    });
  }

  test(`city ${vp.width}x${vp.height}: no pill`, async ({ page }) => {
    const release = await open(page, vp, 'EH1 1YZ', '2026-10-30T12:00:00Z');
    release();
    const scene = page.getByRole('region', { name: /Animated landscape/ });
    await expect(scene).toHaveAttribute('data-scene-type', 'city');
    await page.waitForResponse(/regionid/, { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await expect(page.getByTestId('scene-garden-stage-up')).toHaveCount(0);
    await snap(page, 'city');
  });
}
