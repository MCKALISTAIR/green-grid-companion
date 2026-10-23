import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

/**
 * BH-116 (Design, 23 Oct 2026): ambient birds (FlyingBird, data-ambient="bird")
 * must never cross the hero text box plus 12 px padding, at any size.
 *
 * Clean, clear midday (birds on), reading and outage hero, at 390x844, 320x568
 * and 375x667. Math.random is seeded and the page clock drives framer-motion, so
 * the flight is repeatable. We step 60 s of flight in 0.5 s steps (every bird's
 * delay and at least one full pass) and, at each step, check every visible bird's
 * box against the hero text box (re-measured each step) padded by 12 px.
 *
 * Set BH116_SHOTS=<dir> to save the frame where a bird comes closest to (or
 * deepest into) the padded hero text box, which is outlined in red for review.
 */
test.use({ serviceWorkers: 'block' });

const PAD = 12;
const SHOTS = process.env.BH116_SHOTS;
const MIDDAY = new Date('2026-10-21T11:30:00Z');

type Box = { left: number; top: number; right: number; bottom: number };

async function seedRandom(page: Page) {
  await page.addInitScript(() => {
    let s = 0x5eed116;
    Math.random = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
}

/** Screenshot with the padded hero text box outlined (review evidence only). */
async function shot(page: Page, b: Box, path: string) {
  await page.evaluate((box) => {
    const d = document.createElement('div');
    d.id = 'bh116-outline';
    d.style.cssText = `position:fixed;left:${box.left}px;top:${box.top}px;width:${box.right - box.left}px;height:${box.bottom - box.top}px;outline:2px dashed #e11d48;z-index:99999;pointer-events:none`;
    document.body.appendChild(d);
  }, b);
  await page.screenshot({ path });
  await page.evaluate(() => document.getElementById('bh116-outline')?.remove());
}

/** Signed gap between two boxes: negative when they overlap. */
function gap(a: Box, b: Box) {
  const dx = Math.max(b.left - a.right, a.left - b.right);
  const dy = Math.max(b.top - a.bottom, a.top - b.bottom);
  return Math.max(dx, dy);
}

const VIEWPORTS = [
  [390, 844],
  [320, 568],
  [375, 667],
] as const;

for (const [vw, vh] of VIEWPORTS) {
  for (const mode of ['ok', 'error'] as const) {
    const state = mode === 'ok' ? 'reading' : 'outage';
    test(`${vw}x${vh} ${state}: birds never cross the hero text box + ${PAD}px`, async ({
      page,
      context,
    }) => {
      test.setTimeout(120_000);
      // Page clock first (BH-113).
      await page.clock.install({ time: MIDDAY });
      await page.setViewportSize({ width: vw, height: vh });
      await seedRandom(page);
      await installMocks(context, {
        mode,
        intensity: 30,
        index: 'very low',
        weather: { weather_code: 0, cloud_cover: 0, is_day: 1 },
      });
      await context.addInitScript(seedStorage());
      await page.goto('/');
      const scene = page.getByRole('region', { name: /Animated landscape/ });
      await expect(scene).toHaveAttribute('data-time-of-day', 'midday', { timeout: 30_000 });
      await expect(
        page.getByTestId(mode === 'ok' ? 'hero-band-label' : 'hero-warning-icon'),
      ).toBeVisible({ timeout: 60_000 });

      const text = page.getByTestId('hero-text-block');
      let seen = 0;
      let closest: { gap: number; step: number } = { gap: Infinity, step: -1 };
      const hits: string[] = [];
      for (let step = 0; step < 120; step++) {
        await page.clock.runFor(500);
        const tb = (await text.boundingBox())!;
        const padded: Box = {
          left: tb.x - PAD,
          top: tb.y - PAD,
          right: tb.x + tb.width + PAD,
          bottom: tb.y + tb.height + PAD,
        };
        const birds = await page.locator('[data-ambient="bird"]').evaluateAll(
          (els, w) =>
            els
              .map((el) => {
                const r = el.getBoundingClientRect();
                let o = 1;
                for (let n: Element | null = el; n; n = n.parentElement)
                  o *= Number(getComputedStyle(n).opacity);
                return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, o };
              })
              .filter((b) => b.o > 0.01 && b.right > 0 && b.left < w),
          vw,
        );
        seen += birds.length;
        let closer = false;
        for (const b of birds) {
          const g = gap(b, padded);
          if (g < closest.gap) {
            closest = { gap: g, step };
            closer = true;
          }
          if (g < 0)
            hits.push(`t=${step / 2}s bird ${JSON.stringify(b)} vs ${JSON.stringify(padded)}`);
        }
        if (SHOTS && closer) await shot(page, padded, `${SHOTS}/${state}-${vw}x${vh}.png`);
      }

      if (SHOTS && closest.step < 0) {
        // No birds drawn (no room below the hero text): shoot the last frame.
        const tb = (await text.boundingBox())!;
        await shot(
          page,
          {
            left: tb.x - PAD,
            top: tb.y - PAD,
            right: tb.x + tb.width + PAD,
            bottom: tb.y + tb.height + PAD,
          },
          `${SHOTS}/${state}-${vw}x${vh}.png`,
        );
      }
      console.log(
        `bh116 ${JSON.stringify({ vw, vh, state, birdSightings: seen, closestGapPx: Math.round(closest.gap), hits: hits.length })}`,
      );
      expect(hits, 'birds inside the padded hero text box').toEqual([]);
      // Not vacuous: where the hero leaves room below it, birds still fly.
      if (mode === 'error' || vw === 390) expect(seen).toBeGreaterThan(0);
    });
  }
}
