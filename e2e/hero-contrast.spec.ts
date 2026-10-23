import fs from 'node:fs';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

/**
 * Design review of #185 (23 Oct 2026, incl. BH-107): pixel-measured hero contrast.
 *
 * Replaces the token-based check: for every weather by time of day at 390x844 and
 * 320x568 it hides each hero element, screenshots the pixels actually rendered
 * behind its box (sky, clouds, fog, scrims), and compares the element's computed
 * colour against them. The 5th-percentile ratio is asserted, which ignores the
 * odd anti-aliased edge of a neighbouring element brushing the box.
 *
 *   hero number, band label, error title ("NESO ISN'T ANSWERING"): >= 4.5:1
 *   warning icon (non-text graphic): >= 3:1
 *
 * Everything is mocked and the service worker is blocked. Set HERO_CONTRAST_OUT
 * to a directory to log the table (JSONL) and save 390/320 shots there.
 */
test.use({ serviceWorkers: 'block' });

const OUT = process.env.HERO_CONTRAST_OUT;

// 21 Oct 2026, inside the same phase for London and Edinburgh coordinates.
const TIMES = [
  ['dawn', '2026-10-21T06:30:00Z'],
  ['morning', '2026-10-21T08:30:00Z'],
  ['midday', '2026-10-21T11:30:00Z'],
  ['afternoon', '2026-10-21T14:30:00Z'],
  ['sunset', '2026-10-21T16:30:00Z'],
  ['dusk', '2026-10-21T17:45:00Z'],
  ['night', '2026-10-21T21:00:00Z'],
] as const;

// What Open-Meteo sends for each weather (WMO code + cloud cover).
const WEATHERS = [
  ['clear', { weather_code: 0, cloud_cover: 0 }],
  ['partly', { weather_code: 2, cloud_cover: 40 }],
  ['overcast', { weather_code: 3, cloud_cover: 100 }],
  ['fog', { weather_code: 45, cloud_cover: 100 }],
  ['rain', { weather_code: 63, cloud_cover: 95 }],
  ['storm', { weather_code: 95, cloud_cover: 90 }],
  ['snow', { weather_code: 73, cloud_cover: 90 }],
] as const;

const VIEWPORTS = [
  [390, 844],
  [320, 568],
] as const;

const TEXT_MIN = 4.5;
const ICON_MIN = 3;

/** 5th-percentile contrast of `colour` (may carry alpha) against the pixels behind `el`. */
async function measure(page: Page, el: Locator, colour: string) {
  const box = (await el.boundingBox())!;
  await el.evaluate((n) => ((n as HTMLElement).style.visibility = 'hidden'));
  const png = await page.screenshot({ clip: box, animations: 'disabled' });
  await el.evaluate((n) => ((n as HTMLElement).style.visibility = ''));
  const blank = await page.context().newPage();
  const p5 = await blank.evaluate(
    async ({ b64, colour }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, img.width, img.height);
      const lin = (v: number) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      const lum = (r: number, g: number, b: number) =>
        0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const [fr, fg, fb, fa = 1] = colour.match(/[\d.]+/g)!.map(Number);
      const ratios: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        const [br, bg, bb] = [data[i], data[i + 1], data[i + 2]];
        // Translucent text (text-white/95) is composited over the pixel behind it.
        const lf = lum(fr * fa + br * (1 - fa), fg * fa + bg * (1 - fa), fb * fa + bb * (1 - fa));
        const lb = lum(br, bg, bb);
        ratios.push((Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05));
      }
      ratios.sort((a, b) => a - b);
      return ratios[Math.floor(ratios.length * 0.05)];
    },
    { b64: png.toString('base64'), colour },
  );
  await blank.close();
  return Math.round(p5 * 100) / 100;
}

const colourOf = (el: Locator) => el.evaluate((n) => getComputedStyle(n).color);

async function open(
  page: Page,
  context: import('@playwright/test').BrowserContext,
  vw: number,
  vh: number,
  t: string,
  iso: string,
  weather: object,
  mode: 'ok' | 'error',
) {
  await page.clock.install({ time: new Date(iso) });
  await page.setViewportSize({ width: vw, height: vh });
  const isDay = t === 'night' || t === 'dusk' ? 0 : 1;
  await installMocks(context, { mode, weather: { ...weather, is_day: isDay } });
  await context.addInitScript(seedStorage());
  await page.goto('/');
  // BH-113: the page clock is installed before anything else (Node's Date.now is
  // never pinned), so past instants apply. Prove the scene is at the intended time.
  await expect(page.getByRole('region', { name: /Animated landscape/ })).toHaveAttribute(
    'data-time-of-day',
    t,
    { timeout: 30_000 },
  );
}

function log(row: Record<string, unknown>) {
  console.log(`hero-contrast ${JSON.stringify(row)}`);
  if (OUT) fs.appendFileSync(`${OUT}/hero-contrast.jsonl`, `${JSON.stringify(row)}\n`);
}

for (const [vw, vh] of VIEWPORTS) {
  for (const [t, iso] of TIMES) {
    for (const [wn, weather] of WEATHERS) {
      test(`${vw}x${vh} ${t} ${wn}: reading text >= 4.5:1`, async ({ page, context }) => {
        test.setTimeout(90_000);
        await open(page, context, vw, vh, t, iso, weather, 'ok');
        const band = page.getByTestId('hero-band-label');
        await expect(band).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(3000); // sky (2 s), scrim (0.7 s) and typewriter settle
        const tone = await page.getByTestId('hero-gauge').getAttribute('data-hero-tone');
        // The digits: the largest-font element inside the hero number.
        const digits = page.getByTestId('hero-number').locator('[data-hero-digits]');
        await expect(digits).toHaveCount(1);
        const number = await measure(page, digits, await colourOf(digits));
        const label = await measure(page, band, await colourOf(band));
        if (OUT && (wn === 'storm' || wn === 'snow' || wn === 'overcast')) {
          await page.screenshot({ path: `${OUT}/reading-${vw}x${vh}-${t}-${wn}.png` });
        }
        // The #179 rule for every cloud bank: cloud tops at the hero text bottom + 34.
        const bank = page.locator('[data-art="cloud-bank"]');
        let cloudGap: number | null = null;
        if ((await bank.count()) > 0) {
          const text = (await page.getByTestId('hero-text-block').boundingBox())!;
          const bankBox = (await bank.first().boundingBox())!;
          cloudGap = Math.round(bankBox.y - (text.y + text.height));
          expect(cloudGap, `${vw} ${t} ${wn} cloud gap`).toBeGreaterThanOrEqual(33);
        }
        log({ vw, t, wn, state: 'reading', tone, number, label, cloudGap });
        expect(number, `${vw} ${t} ${wn} number`).toBeGreaterThanOrEqual(TEXT_MIN);
        expect(label, `${vw} ${t} ${wn} band label`).toBeGreaterThanOrEqual(TEXT_MIN);
        if (t === 'dusk' || t === 'night') expect(tone).toBe('light');
      });

      test(`${vw}x${vh} ${t} ${wn}: outage icon >= 3:1, title >= 4.5:1`, async ({
        page,
        context,
      }) => {
        test.setTimeout(90_000);
        await open(page, context, vw, vh, t, iso, weather, 'error');
        const icon = page.getByTestId('hero-warning-icon');
        await expect(icon).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(3000);
        const tone = await page.getByTestId('hero-gauge').getAttribute('data-hero-tone');
        const titleEl = page.getByTestId('hero-error-title');
        await expect(titleEl).toHaveText(/NESO isn.t answering/i);
        const iconRatio = await measure(page, icon, await colourOf(icon));
        const title = await measure(page, titleEl, await colourOf(titleEl));
        if (OUT && (wn === 'storm' || wn === 'snow' || wn === 'overcast' || wn === 'clear')) {
          await page.screenshot({ path: `${OUT}/outage-${vw}x${vh}-${t}-${wn}.png` });
        }
        log({ vw, t, wn, state: 'outage', tone, icon: iconRatio, title });
        expect(iconRatio, `${vw} ${t} ${wn} icon`).toBeGreaterThanOrEqual(ICON_MIN);
        expect(title, `${vw} ${t} ${wn} title`).toBeGreaterThanOrEqual(TEXT_MIN);
        if (t === 'dusk' || t === 'night') expect(tone).toBe('light');
      });
    }
  }
}
