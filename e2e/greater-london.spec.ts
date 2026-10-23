import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

// Alistair, 23 Oct 2026: all of London gets London's landmarks, including
// Greater London (BR, CR, HA...), mapped by postcode district. Districts
// outside Greater London (e.g. Watford WD17) do not. Everything is mocked and
// the service worker is blocked.
test.use({ serviceWorkers: 'block' });

const MIDDAY = new Date('2026-06-21T12:00:00+01:00');
const LONDON_LANDMARKS = ['glass-tower-far', 'clock-tower', 'glass-tower-near', 'london-eye'];
// Set GL_SHOTS=1 to write the PR screenshots into docs/pr-shots/greater-london/.
const SHOTS = Boolean(process.env.GL_SHOTS);

async function openHomeAt(
  page: Page,
  postcode: string,
  viewport: { width: number; height: number },
) {
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
  await page.screenshot({ path: `docs/pr-shots/greater-london/${name}-${width}x${height}.png` });
}

const VIEWPORTS = SHOTS
  ? [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ]
  : [{ width: 390, height: 844 }];

for (const viewport of VIEWPORTS) {
  const size = `${viewport.width}x${viewport.height}`;

  for (const [postcode, name] of [
    ['CR0', 'croydon-cr0'],
    ['HA1', 'harrow-ha1'],
  ] as const) {
    // CR0 always runs; HA1 only when taking the PR screenshots.
    if (!SHOTS && postcode !== 'CR0') continue;
    test(`Greater London ${postcode} is a city scene with the London landmarks at ${size}`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const scene = await openHomeAt(page, postcode, viewport);
      await expect(scene).toHaveAttribute('data-scene-type', 'city');
      await expect(scene.locator('[data-city-variant="london"]')).toHaveCount(1);
      await expect(scene.locator('[data-city-landmark="london-eye"]')).toHaveCount(1);
      const found = await landmarksIn(scene);
      for (const lm of LONDON_LANDMARKS) expect(found).toContain(lm);
      await shot(page, name);
    });
  }

  if (SHOTS) {
    test(`Watford WD17 (outside Greater London) shows no London landmarks at ${size}`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const scene = await openHomeAt(page, 'WD17', viewport);
      await expect(scene).toHaveAttribute('data-scene-type', 'countryside');
      expect(await landmarksIn(scene)).toEqual([]);
      await shot(page, 'watford-wd17');
    });
  }
}
