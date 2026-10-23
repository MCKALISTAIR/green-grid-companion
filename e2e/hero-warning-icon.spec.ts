import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

// BH-92 (Design ruling, 23 Oct 2026): the hero warning icon is steady in every
// state, including an online NESO outage with known weather, and follows the hero
// text rule: ink #0f1a24 on light skies, white on dark ones, at >= 3:1 against
// the sky actually behind it. Everything is mocked and the service worker is blocked.
test.use({ serviceWorkers: 'block' });

// 21 Oct 2026, inside the same phase for both London and Edinburgh coordinates.
const TIMES = [
  ['dawn', '2026-10-21T06:30:00Z'],
  ['morning', '2026-10-21T08:30:00Z'],
  ['midday', '2026-10-21T11:30:00Z'],
  ['afternoon', '2026-10-21T14:30:00Z'],
  ['sunset', '2026-10-21T16:30:00Z'],
  ['dusk', '2026-10-21T17:45:00Z'],
  ['night', '2026-10-21T21:00:00Z'],
] as const;

const INK = 'rgb(15, 26, 36)';
const WHITE = 'rgb(255, 255, 255)';

async function expectSteady(page: Page) {
  const icon = page.getByTestId('hero-warning-icon');
  for (let i = 0; i < 4; i += 1) {
    const state = await icon.evaluate((el) => {
      let opacity = 1;
      for (let node: Element | null = el; node; node = node.parentElement) {
        opacity *= Number(getComputedStyle(node).opacity);
      }
      return {
        animationName: getComputedStyle(el).animationName,
        animations: el.getAnimations().length,
        effectiveOpacity: opacity,
        pulseClass: el.classList.contains('animate-pulse'),
      };
    });
    expect(state).toEqual({
      animationName: 'none',
      animations: 0,
      effectiveOpacity: 1,
      pulseClass: false,
    });
    await page.waitForTimeout(400);
  }
}

/** Worst-case contrast of the icon colour against the pixels behind it (icon hidden). */
async function measureContrast(page: Page, iconRgb: string) {
  const icon = page.getByTestId('hero-warning-icon');
  const box = (await icon.boundingBox())!;
  await icon.evaluate((el) => ((el as unknown as HTMLElement).style.visibility = 'hidden'));
  const png = await page.screenshot({ clip: box });
  await icon.evaluate((el) => ((el as unknown as HTMLElement).style.visibility = ''));
  const blank = await page.context().newPage();
  const worst = await blank.evaluate(
    async ({ b64, iconRgb }) => {
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
      const [ir, ig, ib] = iconRgb.match(/\d+/g)!.map(Number);
      const li = lum(ir, ig, ib);
      const ratios: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        const lb = lum(data[i], data[i + 1], data[i + 2]);
        ratios.push((Math.max(li, lb) + 0.05) / (Math.min(li, lb) + 0.05));
      }
      ratios.sort((a, b) => a - b);
      // 5th percentile: ignores anti-aliased text edges that brush the box.
      return ratios[Math.floor(ratios.length * 0.05)];
    },
    { b64: png.toString('base64'), iconRgb },
  );
  await blank.close();
  return worst;
}

for (const [label, iso] of TIMES) {
  test(`online outage with known weather at ${label}: steady icon, hero-text colour, >= 3:1`, async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);
    await page.clock.install({ time: new Date(iso) });
    await page.setViewportSize({ width: 390, height: 844 });
    // NESO 500s; Open-Meteo answers (weather known), and the device is online.
    await installMocks(context, { mode: 'error' });
    await context.addInitScript(seedStorage());
    await page.goto('/');
    const icon = page.getByTestId('hero-warning-icon');
    await expect(icon).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2500); // sky transition (2 s) settles
    await expectSteady(page);
    const tone = await page.getByTestId('hero-gauge').getAttribute('data-hero-tone');
    await expect(icon).toHaveAttribute('data-icon-tone', tone!);
    const colour = await icon.evaluate((el) => getComputedStyle(el).color);
    expect(colour).toBe(tone === 'ink' ? INK : WHITE);
    const worst = await measureContrast(page, colour);
    expect(worst, `${label}: worst contrast ${worst.toFixed(2)}`).toBeGreaterThanOrEqual(3);
    console.log(`BH-92 ${label}: tone ${tone}, worst contrast ${worst.toFixed(2)}:1`);
  });
}
