import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

/**
 * Rank map (BH-156 follow-up, Design review of #253): with all 14 regions and
 * three-digit worst-case figures, no two markers overlap, every marker and leader
 * stays inside the map frame, the label is 11px or more, and the lowest marker
 * clears the bottom nav. Mocked, service worker blocked. RANK_MAP_SHOTS=<dir> saves
 * the PR's after shots.
 */
test.use({ serviceWorkers: 'block' });

const SHOTS = process.env.RANK_MAP_SHOTS;
const REGIONS = [
  'North Scotland',
  'South Scotland',
  'North East England',
  'North West England',
  'Yorkshire',
  'North Wales & Merseyside',
  'East Midlands',
  'West Midlands',
  'East England',
  'South Wales',
  'London',
  'South East England',
  'South England',
  'South West England',
];
// Worst case: every figure three digits wide.
const GRAMS = [888, 103, 200, 140, 194, 181, 339, 260, 179, 164, 104, 333, 288, 999];
const indexFor = (g: number) =>
  g < 25 ? 'very low' : g < 90 ? 'low' : g < 170 ? 'moderate' : g < 230 ? 'high' : 'very high';

async function openRank(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await installMocks(page.context(), {});
  await page.context().addInitScript({ content: seedStorage({}) });
  const now = new Date();
  now.setMinutes(now.getMinutes() < 30 ? 0 : 30, 0, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 16) + 'Z';
  await page.context().route(/\/regional$/, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            from: iso(now),
            to: iso(new Date(+now + 30 * 60_000)),
            regions: REGIONS.map((shortname, i) => ({
              regionid: i + 1,
              dnoregion: shortname,
              shortname,
              intensity: { forecast: GRAMS[i], index: indexFor(GRAMS[i]) },
              generationmix: [],
            })),
          },
        ],
      },
    }),
  );
  await page.goto('/map');
  await expect(page.locator('[data-map-marker]')).toHaveCount(14);
  await page.waitForTimeout(1500); // marker spring settles
}

for (const [w, h] of [
  [390, 844],
  [320, 568],
  [280, 653],
] as const) {
  test(`rank map markers never overlap at ${w}x${h}`, async ({ page }) => {
    await openRank(page, w, h);
    const m = await page.evaluate(() => {
      const frame = document
        .querySelector('[aria-label="Map of regional carbon intensity"]')!
        .getBoundingClientRect();
      const clip = document
        .querySelector('[data-testid="rank-map-frame"]')!
        .getBoundingClientRect();
      const nav = document.querySelector('[data-testid="bottom-nav"]')!.getBoundingClientRect();
      const boxes = [...document.querySelectorAll('[data-map-marker]')].map((e) => {
        const r = e.getBoundingClientRect();
        const label = e.querySelector('span:last-of-type') as HTMLElement;
        return {
          l: r.left,
          r: r.right,
          t: r.top,
          b: r.bottom,
          font: parseFloat(getComputedStyle(label).fontSize),
          labelW: label.getBoundingClientRect().width,
          text: label.textContent,
        };
      });
      let minGap = Infinity;
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i];
          const b = boxes[j];
          const gx = Math.max(b.l - a.r, a.l - b.r);
          const gy = Math.max(b.t - a.b, a.t - b.b);
          minGap = Math.min(minGap, Math.max(gx, gy));
        }
      return {
        boxes,
        minGap,
        frame: [frame.left, frame.right],
        clip: [clip.left, clip.right],
        navTop: nav.top,
      };
    });
    console.log(
      `${w}x${h} minGap=${m.minGap.toFixed(1)} font=${m.boxes[0].font} size=${(m.boxes[0].r - m.boxes[0].l).toFixed(0)}`,
    );
    expect(m.minGap).toBeGreaterThan(0);
    for (const b of m.boxes) {
      expect(b.font).toBeGreaterThanOrEqual(11);
      expect(b.labelW).toBeLessThanOrEqual(b.r - b.l); // three digits fit inside the marker
      expect(b.l).toBeGreaterThanOrEqual(m.clip[0]);
      expect(b.r).toBeLessThanOrEqual(m.clip[1]);
      expect(b.b).toBeLessThan(m.navTop);
    }
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-${w}x${h}.png` });
  });
}
