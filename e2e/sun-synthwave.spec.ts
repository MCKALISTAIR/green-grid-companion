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
