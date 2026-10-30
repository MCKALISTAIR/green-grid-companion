import fs from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';
import { pinClocks, restoreNodeClock } from './support/pinClocks';

// Design review of #190: the castle must hold at least 1.5:1 against the sky
// behind it at every time of day and in every weather, at 390 and 320. Fog is
// exempt (it may soften). Measured from the rendered scene, not from tokens:
// - "on": the castle's box as rendered (twice, to drop moving weather);
// - "key": the same with the castle painted pure magenta, to find where it is
//   actually visible (coverage at least half that of the best-covered castle
//   pixels, so whole-scene grades cancel; a castle veiled by a near-opaque
//   layer in front, e.g. the snow ground, doesn't count);
// - "off": the castle hidden (twice), i.e. the sky behind it.
// For every visible castle pixel we take the WCAG contrast between "on" and
// "off". The cell's score is the median.
// Set CASTLE_CONTRAST_OUT=<file> to append each measurement as JSON lines.
test.use({ serviceWorkers: 'block' });

// 23 Oct 2026. Mocks geocode to EH1: sunrise ~07:52, solar noon ~13:02, sunset ~17:53 BST.
const TIMES = {
  dawn: '2026-10-23T08:00:00+01:00',
  morning: '2026-10-23T10:00:00+01:00',
  midday: '2026-10-23T12:55:00+01:00',
  afternoon: '2026-10-23T15:00:00+01:00',
  sunset: '2026-10-23T17:00:00+01:00',
  dusk: '2026-10-23T18:40:00+01:00',
  night: '2026-10-23T21:30:00+01:00',
} as const;
const WEATHER = {
  clear: { weather_code: 0, cloud_cover: 0 },
  overcast: { weather_code: 3, cloud_cover: 100 },
  rain: { weather_code: 63, cloud_cover: 95 },
  fog: { weather_code: 45, cloud_cover: 100 },
  storm: { weather_code: 95, cloud_cover: 90 },
  snow: { weather_code: 73, cloud_cover: 90 },
} as const;
const MIN_CONTRAST = 1.5;
const OUT = process.env.CASTLE_CONTRAST_OUT;
// Set CASTLE_CONTRAST_DUMP=<dir> to keep the on/off crops for inspection.
const DUMP = process.env.CASTLE_CONTRAST_DUMP;

test.afterEach(restoreNodeClock);

async function openEdinburgh(
  page: Page,
  time: keyof typeof TIMES,
  weather: keyof typeof WEATHER,
  viewport: { width: number; height: number },
  grams: { intensity: number; index: string } = { intensity: 60, index: 'low' },
) {
  // Page clock first, then Node's (BH-113, see support/pinClocks.ts).
  await pinClocks(page, TIMES[time]);
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installMocks(page.context(), {
    intensity: grams.intensity,
    index: grams.index,
    ageMinutes: 5,
    // Flat series: the 40g wobble crossed band edges at some wall-clock hours.
    flatSeries: true,
    weather: { ...WEATHER[weather], is_day: time === 'dusk' || time === 'night' ? 0 : 1 },
  });
  await page.context().addInitScript(seedStorage({ postcode: 'EH1' }));
  await page.goto('/');
  const scene = page.getByRole('region', { name: /Animated landscape/ });
  await expect(scene).toBeVisible({ timeout: 60_000 });
  await expect(scene).toHaveAttribute('data-time-of-day', time);
  await expect(scene.locator('[data-city-variant="edinburgh"]')).toHaveCount(1);
  await page.waitForTimeout(2500); // let the intro fades settle
  return scene;
}

/**
 * Median per-pixel WCAG contrast between the castle-on and castle-off shots,
 * over pixels that changed when the castle was hidden and are stable across two
 * shots of each state (so falling snow or rain never counts as castle).
 */
async function castleContrast(
  page: Page,
  shots: { on: Buffer; on2: Buffer; key: Buffer; off: Buffer; off2: Buffer },
) {
  return page.evaluate(
    async ([a, a2, k, b, b2]) => {
      const decode = async (b64: string) => {
        const bmp = await createImageBitmap(
          await (await fetch(`data:image/png;base64,${b64}`)).blob(),
        );
        const c = new OffscreenCanvas(bmp.width, bmp.height);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(bmp, 0, 0);
        return ctx.getImageData(0, 0, bmp.width, bmp.height).data;
      };
      const [pa, pa2, pk, pb, pb2] = await Promise.all([a, a2, k, b, b2].map(decode));
      const MAGENTA = [255, 0, 255];
      const coverage = (i: number) => {
        let num = 0;
        let den = 0;
        for (let c = 0; c < 3; c++) {
          num += (pk[i + c] - pb[i + c]) * (MAGENTA[c] - pb[i + c]);
          den += (MAGENTA[c] - pb[i + c]) ** 2;
        }
        return den > 0 ? num / den : 0;
      };
      const delta = (x: Uint8ClampedArray, y: Uint8ClampedArray, i: number) =>
        Math.max(
          Math.abs(x[i] - y[i]),
          Math.abs(x[i + 1] - y[i + 1]),
          Math.abs(x[i + 2] - y[i + 2]),
        );
      const lin = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      const lum = (d: Uint8ClampedArray, i: number) =>
        0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
      // Coverage is relative to the best-covered castle pixels in the box, so a
      // whole-scene grade (night, fog) cancels out and only local occluders
      // in front of the castle (snow ground, trees) drop pixels.
      const cov = new Float32Array(pa.length / 4);
      for (let i = 0; i < pa.length; i += 4) cov[i / 4] = coverage(i);
      const covered = Array.from(cov)
        .filter((c) => c > 0.02)
        .sort((x, y) => x - y);
      const ref = covered[Math.floor(covered.length * 0.95)] ?? 1;
      const ratios: number[] = [];
      for (let i = 0; i < pa.length; i += 4) {
        if (cov[i / 4] < 0.5 * ref) continue; // castle not (or barely) visible here
        if (delta(pa, pa2, i) > 4 || delta(pb, pb2, i) > 4) continue; // moving weather
        const [hi, lo] = [lum(pa, i), lum(pb, i)].sort((x, y) => y - x);
        ratios.push((hi + 0.05) / (lo + 0.05));
      }
      ratios.sort((x, y) => x - y);
      return { median: ratios[Math.floor(ratios.length / 2)] ?? 1, pixels: ratios.length };
    },
    [shots.on, shots.on2, shots.key, shots.off, shots.off2].map((x) => x.toString('base64')),
  );
}

async function measureCastle(
  page: Page,
  time: keyof typeof TIMES,
  weather: keyof typeof WEATHER,
  viewport: { width: number; height: number },
  grams: { intensity: number; index: string },
) {
  const scene = await openEdinburgh(page, time, weather, viewport, grams);
  const castle = scene.locator('[data-city-art="edinburgh-castle"]').first();
  const box = (await castle.boundingBox())!;
  const clip = {
    x: Math.floor(box.x),
    y: Math.floor(box.y),
    width: Math.ceil(box.width),
    height: Math.ceil(box.height),
  };
  const on = await page.screenshot({ clip });
  await page.waitForTimeout(300);
  const on2 = await page.screenshot({ clip });
  const keyStyle = await page.addStyleTag({
    content:
      '[data-city-art="edinburgh-castle"] * { fill: #ff00ff !important; stroke: #ff00ff !important; opacity: 1 !important; }',
  });
  const key = await page.screenshot({ clip });
  await keyStyle.evaluate((el) => el.remove());
  await castle.evaluate((el) => ((el as unknown as HTMLElement).style.visibility = 'hidden'));
  const off = await page.screenshot({ clip });
  await page.waitForTimeout(300);
  const off2 = await page.screenshot({ clip });
  const { median, pixels } = await castleContrast(page, { on, on2, key, off, off2 });
  if (DUMP) {
    const tag = `${DUMP}/${time}-${weather}-${grams.intensity}g-${viewport.width}`;
    fs.writeFileSync(`${tag}-on.png`, on);
    fs.writeFileSync(`${tag}-off.png`, off);
    fs.writeFileSync(`${tag}-key.png`, key);
  }
  if (OUT) {
    fs.appendFileSync(
      OUT,
      JSON.stringify({ vw: viewport.width, time, weather, g: grams.intensity, median, pixels }) +
        '\n',
    );
  }
  // Fog is exempt: it may soften the castle, or hide it entirely.
  if (weather !== 'fog') {
    expect(pixels, 'castle should be visible').toBeGreaterThan(200);
    expect(median).toBeGreaterThanOrEqual(MIN_CONTRAST);
  }
}

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];

for (const viewport of VIEWPORTS) {
  for (const time of Object.keys(TIMES) as Array<keyof typeof TIMES>) {
    for (const weather of Object.keys(WEATHER) as Array<keyof typeof WEATHER>) {
      test(`castle vs sky: ${time} ${weather} at ${viewport.width}x${viewport.height}`, async ({
        page,
      }) => {
        test.setTimeout(120_000);
        await measureCastle(page, time, weather, viewport, { intensity: 60, index: 'low' });
      });
    }
  }
}

// (d) At very high the smog haze sits over the landmark layer. By day the castle
// must still hold 1.5:1 in every weather but fog.
const DAY_TIMES = ['morning', 'midday', 'afternoon'] as const;
for (const viewport of VIEWPORTS) {
  for (const time of DAY_TIMES) {
    for (const weather of Object.keys(WEATHER) as Array<keyof typeof WEATHER>) {
      test(`castle vs sky at very high: ${time} ${weather} at ${viewport.width}x${viewport.height}`, async ({
        page,
      }) => {
        test.setTimeout(120_000);
        await measureCastle(page, time, weather, viewport, { intensity: 300, index: 'very high' });
      });
    }
  }
}
