import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

// PR-B2 (BH-98, BH-99). Alistair's decisions, 23 Oct 2026:
// - London keeps its landmarks (Shard-like tower, clock tower, London Eye).
// - Edinburgh (city districts EH1 to EH17) gets its own variant (art to follow);
//   every other city, including EH18 and up, is generic.
// - DN, SY, FK and PH are inland and never get the coastal scene.
// Everything is mocked and the service worker is blocked.
test.use({ serviceWorkers: 'block' });

const MIDDAY = new Date('2026-06-21T12:00:00+01:00');
const LONDON_LANDMARKS = ['glass-tower-far', 'clock-tower', 'glass-tower-near', 'london-eye'];
// Set B2_SHOTS=1 to write the PR screenshots into docs/pr-shots/b2/.
const SHOTS = Boolean(process.env.B2_SHOTS);

async function openHomeAt(page: Page, postcode: string, viewport = { width: 390, height: 844 }) {
  await page.clock.install({ time: MIDDAY });
  await page.setViewportSize(viewport);
  await installMocks(page.context(), { intensity: 60, index: 'low' });
  await page.context().addInitScript(seedStorage({ postcode }));
  await page.goto('/');
  const scene = page.getByRole('region', { name: /Animated landscape/ });
  await expect(scene).toBeVisible({ timeout: 30_000 });
  return scene;
}

async function landmarksIn(scene: ReturnType<Page['getByRole']>) {
  return scene
    .locator('[data-city-landmark]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-city-landmark')));
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.waitForTimeout(2500); // let the intro fades settle
  const { width, height } = page.viewportSize()!;
  await page.screenshot({ path: `docs/pr-shots/b2/${name}-${width}x${height}.png` });
}

const VIEWPORTS = SHOTS
  ? [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ]
  : [{ width: 390, height: 844 }];

for (const viewport of VIEWPORTS) {
  const size = `${viewport.width}x${viewport.height}`;

  test(`London (SW1A) shows the London landmarks at ${size}`, async ({ page }) => {
    test.setTimeout(90_000);
    const scene = await openHomeAt(page, 'SW1A', viewport);
    await expect(scene).toHaveAttribute('data-scene-type', 'city');
    await expect(scene.locator('[data-city-variant="london"]')).toHaveCount(1);
    await expect(scene.locator('[data-city-landmark="london-eye"]')).toHaveCount(1);
    const found = await landmarksIn(scene);
    for (const lm of LONDON_LANDMARKS) expect(found).toContain(lm);
    await shot(page, 'london-sw1a');
  });

  for (const [postcode, variant, name] of [
    ['M1', 'generic', 'manchester-m1'],
    ['EH1', 'edinburgh', 'edinburgh-eh1'],
    ['EH18', 'generic', 'lothians-eh18'],
  ] as const) {
    test(`${name} shows no London landmarks at ${size}`, async ({ page }) => {
      test.setTimeout(90_000);
      const scene = await openHomeAt(page, postcode, viewport);
      await expect(scene).toHaveAttribute('data-scene-type', 'city');
      await expect(scene.locator(`[data-city-variant="${variant}"]`)).toHaveCount(1);
      // The skyline itself is still there.
      await expect(scene.locator(`[data-city-landmark-slot="${variant}-front"]`)).toHaveCount(1);
      expect(await landmarksIn(scene)).toEqual([]);
      await shot(page, name);
    });
  }

  test(`inland DN1 gets the countryside scene, not coastal, at ${size}`, async ({ page }) => {
    test.setTimeout(90_000);
    const scene = await openHomeAt(page, 'DN1', viewport);
    await expect(scene).toHaveAttribute('data-scene-type', 'countryside');
    expect(await landmarksIn(scene)).toEqual([]);
    await shot(page, 'inland-dn1');
  });
}
