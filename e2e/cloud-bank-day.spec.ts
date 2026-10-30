import fs from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

/**
 * Design review of #185 (23 Oct 2026): by day (dawn to sunset) the overcast bank
 * below the hero text must not read as a blank white hole. Pixel-measured for
 * overcast, rain and snow at 390x844 and 320x568, in the reading and the outage
 * hero:
 *
 *   (a) the bank body (median luminance of its pixels) is within 1.15:1 of the
 *       sky just above the bank's top edge (median of the 4 px strip above it);
 *   (b) no bank pixel is lighter than that sky: lighter than the lightest pixel
 *       of the strip (the sky is dithered by a pixel level or two, so its own
 *       spread is the tolerance). The lit rim on the top lobes is the one
 *       exception, so it is hidden for the measurement.
 *
 * Bank pixels are found by difference. The scene is frozen (page clock paused)
 * and everything inside it except the sky and the bank is hidden: skyline,
 * ground, rain, snow, sun glow and spotlight. It is then screenshotted with the
 * bank and again with the bank hidden; every pixel that changes belongs to the
 * bank. The scene filter, the intensity mood haze, the depth haze and the hero
 * scrim stay on, as in the composed scene; only the halo (SceneHeroSpotlight,
 * retired by PR-2b) and the scene's objects are hidden. Only the bank above
 * the sheet's scalloped edge (scene-wave-divider) is measured, so the sheet,
 * its scallop and anything it covers aren't counted.
 * The composed scene is saved as a shot for the eye.
 *
 * The page clock is installed before anything else (BH-113), and each test
 * asserts the scene's data-time-of-day. Set CLOUD_BANK_OUT to log a JSONL table
 * and save shots.
 */
test.use({ serviceWorkers: 'block' });

const OUT = process.env.CLOUD_BANK_OUT;
const BODY_MAX = 1.15;

const TIMES = [
  ['dawn', '2026-10-21T06:30:00Z'],
  ['morning', '2026-10-21T08:30:00Z'],
  ['midday', '2026-10-21T11:30:00Z'],
  ['afternoon', '2026-10-21T14:30:00Z'],
  ['sunset', '2026-10-21T16:30:00Z'],
] as const;

const WEATHERS = [
  ['overcast', { weather_code: 3, cloud_cover: 100 }],
  ['rain', { weather_code: 63, cloud_cover: 95 }],
  ['snow', { weather_code: 73, cloud_cover: 90 }],
] as const;

const VIEWPORTS = [
  [390, 844],
  [320, 568],
] as const;

type Clip = { x: number; y: number; width: number; height: number };

/** Relative luminance stats of the sky strip and of the pixels that differ between two shots. */
async function analyse(page: Page, sky: Buffer, withBank: Buffer, without: Buffer) {
  const blank = await page.context().newPage();
  const r = await blank.evaluate(
    async ({ sky, withBank, without }) => {
      const pixels = async (b64: string) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height).data;
      };
      const lin = (v: number) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      const lum = (d: Uint8ClampedArray, i: number) =>
        0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
      const median = (a: number[]) => {
        a.sort((x, y) => x - y);
        return a[Math.floor(a.length / 2)];
      };
      const s = await pixels(sky);
      const skyL: number[] = [];
      for (let i = 0; i < s.length; i += 4) skyL.push(lum(s, i));
      const a = await pixels(withBank);
      const b = await pixels(without);
      const bankL: number[] = [];
      let maxL = 0;
      let maxAt = -1;
      for (let i = 0; i < a.length; i += 4) {
        const diff =
          Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
        // Changed by more than ~3 levels a channel: the bank, not a faint anti-aliased
        // edge pixel that is still essentially the sky beside it.
        if (diff <= 9) continue;
        const l = lum(a, i);
        bankL.push(l);
        if (l > maxL) {
          maxL = l;
          maxAt = i / 4;
        }
      }
      return {
        skyL: median(skyL),
        skyMaxL: Math.max(...skyL),
        bodyL: bankL.length ? median(bankL) : NaN,
        maxL,
        maxAt,
        n: bankL.length,
      };
    },
    {
      sky: sky.toString('base64'),
      withBank: withBank.toString('base64'),
      without: without.toString('base64'),
    },
  );
  await blank.close();
  return r;
}

const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const r2 = (n: number) => Math.round(n * 1000) / 1000;

for (const [vw, vh] of VIEWPORTS) {
  for (const [t, iso] of TIMES) {
    for (const [wn, weather] of WEATHERS) {
      for (const mode of ['ok', 'error'] as const) {
        const state = mode === 'ok' ? 'reading' : 'outage';
        test(`${vw}x${vh} ${t} ${wn} ${state}: day bank close to the sky, never lighter`, async ({
          page,
          context,
        }) => {
          test.setTimeout(90_000);
          await page.clock.install({ time: new Date(iso) });
          await page.setViewportSize({ width: vw, height: vh });
          await installMocks(context, { mode, weather: { ...weather, is_day: 1 } });
          await context.addInitScript(seedStorage());
          await page.goto('/');
          const scene = page.getByRole('region', { name: /Animated landscape/ });
          await expect(scene).toHaveAttribute('data-time-of-day', t, { timeout: 30_000 });
          await expect(
            page.getByTestId(mode === 'ok' ? 'hero-band-label' : 'hero-warning-icon'),
          ).toBeVisible({ timeout: 60_000 });
          const bank = page.locator('[data-art="cloud-bank"]');
          // G-11: wait out the 400ms cross-fade from the unknown-weather bank.
          await expect(bank).toHaveCount(1);
          await expect(bank).toHaveAttribute('data-tone', 'day');
          const target = page.getByTestId(mode === 'ok' ? 'hero-band-label' : 'hero-warning-icon');
          // Freeze every animation (framer-motion runs on the page clock), once the
          // sky (2 s) and scrim (0.7 s) have settled. The outage hero retries on its
          // own and briefly shows "Loading…"; if it froze there, run on and freeze again.
          for (let attempt = 0; ; attempt++) {
            await page.waitForTimeout(3000);
            await expect(target).toBeVisible({ timeout: 30_000 });
            const now = await page.evaluate(() => Date.now());
            await page.clock.pauseAt(now + 200);
            await page.waitForTimeout(300);
            if ((await target.isVisible()) && (await bank.getAttribute('data-tone')) === 'day')
              break;
            expect(attempt, 'hero state stable when frozen').toBeLessThan(3);
            await page.clock.resume();
          }
          // The composed scene, for the eye.
          if (OUT)
            await page.screenshot({ path: `${OUT}/bank-${state}-${vw}x${vh}-${t}-${wn}.png` });
          // Sky, bank and the scene-wide haze only (PR-2b: SceneHaze replaced the mood
          // and depth layers); the rim is hidden (the one allowed exception).
          await page.addStyleTag({
            content: [
              '[data-scene-type] * { visibility: hidden !important; }',
              '[data-art="cloud-bank"], [data-art="cloud-bank"] *, [data-art="haze"], [data-art="haze"] * { visibility: visible !important; }',
              '[data-bank-rim], [data-bank-rim] * { visibility: hidden !important; }',
              '[data-art="cloud-bank"].bank-off, [data-art="cloud-bank"].bank-off * { visibility: hidden !important; }',
            ].join('\n'),
          });
          await page.waitForTimeout(100);

          const box = (await bank.boundingBox())!;
          const top = Math.round(box.y);
          // The sky right at the bank's top edge (the 4 rows above its highest lobe).
          const skyClip: Clip = { x: 0, y: top - 4, width: vw, height: 4 };
          // Down to the sheet's scalloped edge: the bank as seen above the sheet.
          const sheet = (await page.getByTestId('scene-wave-divider').boundingBox())!;
          // The wave's crests rise at most ~17px (amplitude 22 × 0.75); stop 24px above its base.
          const bottom = Math.min(vh, Math.round(sheet.y + sheet.height - 24));
          const bankClip: Clip = { x: 0, y: top, width: vw, height: bottom - top };
          if (bottom - top < 8) {
            // Tall reading copy pushes the bank's top below the sheet's edge: none of it
            // shows, so there is nothing to look like a hole. Record it and stop.
            const row = { vw, t, wn, state, bankTop: top, bankBottom: bottom, hidden: true };
            console.log(`cloud-bank-day ${JSON.stringify(row)}`);
            if (OUT) fs.appendFileSync(`${OUT}/cloud-bank-day.jsonl`, `${JSON.stringify(row)}\n`);
            return;
          }
          const shot = (clip: Clip) => page.screenshot({ clip, animations: 'disabled' });
          const sky = await shot(skyClip);
          const withBank = await shot(bankClip);
          if (OUT)
            fs.writeFileSync(`${OUT}/bank-only-${state}-${vw}x${vh}-${t}-${wn}.png`, withBank);
          await bank.evaluate((n) => n.classList.add('bank-off'));
          await page.waitForTimeout(100);
          const without = await shot(bankClip);
          await bank.evaluate((n) => n.classList.remove('bank-off'));

          const m = await analyse(page, sky, withBank, without);
          const body = ratio(m.bodyL, m.skyL);
          const row = {
            vw,
            t,
            wn,
            state,
            bankTop: top,
            bankBottom: bottom,
            bankPixels: m.n,
            skyL: r2(m.skyL),
            skyMaxL: r2(m.skyMaxL),
            bodyL: r2(m.bodyL),
            bodyVsSky: Math.round(body * 100) / 100,
            bodyDarker: m.bodyL <= m.skyL,
            maxL: r2(m.maxL),
            maxAt: m.maxAt < 0 ? null : [m.maxAt % vw, top + Math.floor(m.maxAt / vw)],
          };
          console.log(`cloud-bank-day ${JSON.stringify(row)}`);
          if (OUT) fs.appendFileSync(`${OUT}/cloud-bank-day.jsonl`, `${JSON.stringify(row)}\n`);
          expect(m.n, 'bank pixels found').toBeGreaterThan(vw * 4);
          expect(body, `${vw} ${t} ${wn} ${state} body vs sky`).toBeLessThanOrEqual(BODY_MAX);
          expect(
            m.maxL,
            `${vw} ${t} ${wn} ${state} lightest bank pixel vs sky`,
          ).toBeLessThanOrEqual(m.skyMaxL);
        });
      }
    }
  }
}
