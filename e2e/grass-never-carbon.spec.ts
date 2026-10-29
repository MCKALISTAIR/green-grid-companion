import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

/**
 * Design decision 12 (23 Oct 2026): "grass never reacts to carbon". On the real
 * home page (countryside, midday, clear), the land looks the same at every NESO
 * band: the hill and tree colours, the ground colour and the scene-wide filter
 * (which used to brown and dull the land as carbon rose) are identical. Carbon
 * shows only as haze and gas-plant smoke. Mobile first: 390x844, then 320x568.
 *
 * Set GRASS_SHOTS to a directory to save one shot per band and viewport
 * ({prefix}-{band}-{w}x{h}.png, prefix from GRASS_SHOTS_PREFIX, default "after").
 */
test.use({ serviceWorkers: 'block' });

const SHOTS = process.env.GRASS_SHOTS;
const PREFIX = process.env.GRASS_SHOTS_PREFIX ?? 'after';

const BANDS = [
  ['very-low', 20, 'very low'],
  ['low', 110, 'low'],
  ['moderate', 180, 'moderate'],
  ['high', 260, 'high'],
  ['very-high', 340, 'very high'],
] as const;

const VIEWPORTS = [
  [390, 844],
  [320, 568],
] as const;

/** Colours of every hill and tree (gradients resolved to their stops), the ground, and the filter over the land. */
async function landTokens(page: Page) {
  return page.evaluate(() => {
    const colours: string[] = [];
    const resolve = (v: string) => {
      const m = /^url\(["']?#([^"')]+)["']?\)$/.exec(v);
      if (!m) return v;
      const g = document.getElementById(m[1]);
      return g
        ? [...g.querySelectorAll('stop')].map((s) => getComputedStyle(s).stopColor).join('>')
        : v;
    };
    const hills = [...document.querySelectorAll('[data-land="hill"]')];
    for (const h of hills)
      for (const n of [h, ...h.querySelectorAll('*')]) {
        const cs = getComputedStyle(n);
        if (n instanceof SVGElement && n.tagName !== 'g') colours.push(resolve(cs.fill));
      }
    const ground = document.querySelector<HTMLElement>('[data-land="ground"]');
    // The filters every hill sits under (the whole-scene grade used to vary by carbon).
    const filters: string[] = [];
    for (let e: Element | null = hills[0] ?? null; e; e = e.parentElement) {
      const f = getComputedStyle(e).filter;
      if (f && f !== 'none') filters.push(f);
    }
    return {
      hills: hills.length,
      colours,
      ground: ground ? getComputedStyle(ground).backgroundColor : null,
      filters,
    };
  });
}

for (const [vw, vh] of VIEWPORTS) {
  test(`${vw}x${vh}: the land is identical at every NESO band (countryside, midday, clear)`, async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const seen: { band: string; tokens: Awaited<ReturnType<typeof landTokens>> }[] = [];
    for (const [band, intensity, index] of BANDS) {
      const context = await browser.newContext({
        viewport: { width: vw, height: vh },
        serviceWorkers: 'block',
      });
      const page = await context.newPage();
      await page.clock.install({ time: new Date('2026-10-21T11:30:00Z') });
      await installMocks(context, {
        intensity,
        index,
        weather: { weather_code: 0, cloud_cover: 5, is_day: 1 },
      });
      await context.addInitScript(seedStorage({ postcode: 'DN1 1AA' }));
      await page.goto('/');
      const scene = page.getByRole('region', { name: /Animated landscape/ });
      await expect(scene).toHaveAttribute('data-time-of-day', 'midday', { timeout: 30_000 });
      await expect(page.getByTestId('hero-band-label')).toBeVisible({ timeout: 60_000 });
      await expect(scene).toHaveAttribute('data-scene-type', 'countryside');
      // Let the intro and the 2 s sky/filter transition settle, then freeze.
      await page.waitForTimeout(4000);
      const now = await page.evaluate(() => Date.now());
      await page.clock.pauseAt(now + 200);
      await page.waitForTimeout(300);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${PREFIX}-${band}-${vw}x${vh}.png` });
      seen.push({ band, tokens: await landTokens(page) });
      await context.close();
    }
    expect(seen[0].tokens.hills).toBeGreaterThanOrEqual(3);
    expect(seen[0].tokens.ground).toBeTruthy();
    for (const s of seen) expect(s.tokens, s.band).toEqual(seen[0].tokens);
  });
}
