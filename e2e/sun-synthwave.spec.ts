import fs from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

// BH-96 (Design brief Q1, 23 Oct 2026): a single or double tap on the sun only
// gives the small sun reaction; three taps within 1.5 s toggle synthwave (the sun
// then wears its sunglasses), and three more turn it off. Resets on reload.
// Under Reduce Motion the sun is fully still.
// Everything is mocked and the service worker is blocked.
test.use({ serviceWorkers: 'block', hasTouch: true });

const MIDDAY = new Date('2026-06-21T12:00:00+01:00');
const CLEAR = { weather_code: 0, cloud_cover: 0, wind_speed_10m: 8 };

async function openSunnyHome(page: Page, viewport = { width: 390, height: 844 }, reduce = false) {
  if (reduce) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: MIDDAY });
  await page.setViewportSize(viewport);
  await installMocks(page.context(), { weather: CLEAR });
  await page.context().addInitScript(seedStorage());
  await page.goto('/');
  const scene = page.getByRole('region', { name: /Animated landscape/ });
  await expect(scene).toBeVisible({ timeout: 30_000 });
  const sun = scene.locator('[data-scene-sun-tap]');
  await expect(sun).toBeVisible({ timeout: 15_000 });
  return { scene, sun };
}

async function tapSun(page: Page, times: number) {
  const box = await page.locator('[data-scene-sun-tap]').boundingBox();
  if (!box) throw new Error('sun not on screen');
  for (let i = 0; i < times; i += 1) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(120);
  }
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  const size = `${viewport.width}x${viewport.height}`;

  test(`a single tap gives the sun reaction only, never synthwave at ${size}`, async ({ page }) => {
    test.setTimeout(90_000);
    const { scene } = await openSunnyHome(page, viewport);
    await expect(scene).toHaveAttribute('data-synthwave', 'off');
    await tapSun(page, 1);
    await expect(scene.locator('[data-sun-reaction]')).toHaveAttribute('data-sun-reaction', 'on');
    await expect(scene.locator('[data-sun-sunglasses]')).toHaveCount(0);
    // Past the 1.5 s window, still off.
    await page.waitForTimeout(1600);
    await expect(scene).toHaveAttribute('data-synthwave', 'off');
  });

  test(`a double tap (and a mouse double-click) never toggles synthwave at ${size}`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const { scene, sun } = await openSunnyHome(page, viewport);
    await tapSun(page, 2);
    await page.waitForTimeout(1600);
    await expect(scene).toHaveAttribute('data-synthwave', 'off');
    await sun.dblclick({ force: true });
    await page.waitForTimeout(1600);
    await expect(scene).toHaveAttribute('data-synthwave', 'off');
  });

  test(`a triple tap toggles synthwave on and off, reload resets it at ${size}`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const { scene } = await openSunnyHome(page, viewport);
    await tapSun(page, 3);
    await expect(scene).toHaveAttribute('data-synthwave', 'on');
    await expect(scene.locator('[data-sun-sunglasses]')).toHaveCount(1);
    await page.waitForTimeout(1600);
    await tapSun(page, 3);
    await expect(scene).toHaveAttribute('data-synthwave', 'off');
    await page.waitForTimeout(1600);
    await tapSun(page, 3);
    await expect(scene).toHaveAttribute('data-synthwave', 'on');
    await page.reload();
    await expect(page.getByRole('region', { name: /Animated landscape/ })).toHaveAttribute(
      'data-synthwave',
      'off',
      { timeout: 30_000 },
    );
  });
}

test('three taps spread over 1.6 s do not toggle synthwave', async ({ page }) => {
  test.setTimeout(90_000);
  const { scene } = await openSunnyHome(page);
  await tapSun(page, 1);
  await page.waitForTimeout(800);
  await tapSun(page, 1);
  await page.waitForTimeout(800);
  await tapSun(page, 1);
  await expect(scene).toHaveAttribute('data-synthwave', 'off');
});

test('Reduce Motion: no float, no tap scale, no CSS filter; triple tap still works', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const { scene, sun } = await openSunnyHome(page, { width: 390, height: 844 }, true);
  const transforms = async () =>
    sun.evaluate((el) => {
      const out: string[] = [];
      for (let n: Element | null = el; n && !n.hasAttribute('role'); n = n.parentElement) {
        out.push(getComputedStyle(n).transform);
      }
      return out.join('|');
    });
  await page.waitForTimeout(1600); // past any entry transition
  const first = await transforms();
  await page.waitForTimeout(2100);
  expect(await transforms()).toBe(first);
  await tapSun(page, 1);
  await expect(scene.locator('[data-sun-reaction]')).toHaveAttribute('data-sun-reaction', 'off');
  const filter = await scene
    .locator('[data-scene-sun]')
    .evaluate((el) => getComputedStyle(el).filter);
  expect(filter).toBe('none');
  await page.waitForTimeout(1600);
  await tapSun(page, 3);
  await expect(scene).toHaveAttribute('data-synthwave', 'on');
});

test('the sun is not a VoiceOver or keyboard control', async ({ page }) => {
  test.setTimeout(90_000);
  const { scene, sun } = await openSunnyHome(page);
  await expect(sun).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('button', { name: /synthwave|sun/i })).toHaveCount(0);
  await sun.evaluate((el) => {
    for (const key of ['Enter', ' ']) {
      el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }
  });
  await expect(scene).toHaveAttribute('data-synthwave', 'off');
});

// Design review of #184 (23 Oct 2026): the synthwave sky is dark at every time of
// day, so while synthwave is on the hero text and icon are white. Pixel-measured:
// each element is hidden, the pixels actually rendered behind its box are
// screenshotted, and the 5th-percentile contrast of its computed colour against
// them must be >= 4.5:1 (ink measured 2.35-2.74:1 there; white 6.4-7.5:1).
// Set SYNTHWAVE_CONTRAST_OUT to a directory to log the table and save shots.

async function contrastBehind(page: Page, selector: string) {
  const el = page.locator(selector).first();
  const colour = await el.evaluate((n) => getComputedStyle(n).color);
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
  return { colour, ratio: Math.round(p5 * 100) / 100 };
}

// In October the sun can sit under the hero text (the info button takes the tap),
// so the contrast tests below dispatch the three taps to the sun itself. The tap
// tests above cover real taps on screen.
async function tripleTapSunDirect(page: Page) {
  const sun = page.locator('[data-scene-sun-tap]');
  for (let i = 0; i < 3; i += 1) {
    await sun.dispatchEvent('pointerup');
    await page.waitForTimeout(120);
  }
}

const SYNTHWAVE_TIMES = [
  ['morning', '2026-10-21T08:30:00Z'],
  ['midday', '2026-10-21T11:30:00Z'],
  ['afternoon', '2026-10-21T14:30:00Z'],
  ['sunset', '2026-10-21T16:30:00Z'],
] as const;

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  for (const [label, iso] of SYNTHWAVE_TIMES) {
    const size = `${viewport.width}x${viewport.height}`;
    test(`synthwave at ${label} ${size}: hero text and icon white, >= 4.5:1`, async ({
      page,
      browser,
      baseURL,
    }) => {
      test.setTimeout(120_000);
      const out = process.env.SYNTHWAVE_CONTRAST_OUT;
      const time = new Date(iso);
      // Reading: hero number and band label.
      await page.clock.install({ time });
      await page.setViewportSize(viewport);
      await installMocks(page.context(), { weather: CLEAR });
      await page.context().addInitScript(seedStorage());
      await page.goto('/');
      const scene = page.getByRole('region', { name: /Animated landscape/ });
      await expect(scene.locator('[data-scene-sun-tap]')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('hero-band-label')).toBeVisible({ timeout: 30_000 });
      const gauge = page.getByTestId('hero-gauge');
      const before = await gauge.getAttribute('data-hero-tone');
      await tripleTapSunDirect(page);
      await expect(scene).toHaveAttribute('data-synthwave', 'on');
      await expect(gauge).toHaveAttribute('data-hero-tone', 'light');
      await page.waitForTimeout(2600); // sky and scrim transitions settle
      const number = await contrastBehind(page, '[data-testid="hero-number"] [data-hero-digits]');
      const band = await contrastBehind(page, '[data-testid="hero-band-label"]');
      expect(number.colour).toBe('rgb(255, 255, 255)');
      expect(band.colour).toBe('rgb(255, 255, 255)');
      if (out) await page.screenshot({ path: `${out}/synthwave-reading-${label}-${size}.png` });

      // Outage: the warning icon over the same synthwave sky. A fresh context, so
      // no cached reading from the page above hides the outage.
      const outageContext = await browser.newContext({
        baseURL,
        serviceWorkers: 'block',
        hasTouch: true,
      });
      const outage = await outageContext.newPage();
      await outage.clock.install({ time });
      await outage.setViewportSize(viewport);
      await installMocks(outageContext, { mode: 'error', weather: CLEAR });
      await outageContext.addInitScript(seedStorage());
      await outage.goto('/');
      const outageScene = outage.getByRole('region', { name: /Animated landscape/ });
      await expect(outage.getByTestId('hero-warning-icon')).toBeVisible({ timeout: 30_000 });
      await expect(outageScene.locator('[data-scene-sun-tap]')).toBeVisible({ timeout: 15_000 });
      await tripleTapSunDirect(outage);
      await expect(outageScene).toHaveAttribute('data-synthwave', 'on');
      await expect(outage.getByTestId('hero-gauge')).toHaveAttribute('data-hero-tone', 'light');
      await outage.waitForTimeout(2600);
      const icon = await contrastBehind(outage, '[data-testid="hero-warning-icon"]');
      expect(icon.colour).toBe('rgb(255, 255, 255)');
      if (out) await outage.screenshot({ path: `${out}/synthwave-outage-${label}-${size}.png` });
      await outageContext.close();

      const row = {
        size,
        label,
        toneBefore: before,
        number: number.ratio,
        band: band.ratio,
        icon: icon.ratio,
      };
      console.log(`synthwave-contrast ${JSON.stringify(row)}`);
      if (out) fs.appendFileSync(`${out}/synthwave-contrast.jsonl`, `${JSON.stringify(row)}\n`);
      expect(number.ratio, `${label} ${size} number`).toBeGreaterThanOrEqual(4.5);
      expect(band.ratio, `${label} ${size} band label`).toBeGreaterThanOrEqual(4.5);
      expect(icon.ratio, `${label} ${size} icon`).toBeGreaterThanOrEqual(3);
    });
  }
}
