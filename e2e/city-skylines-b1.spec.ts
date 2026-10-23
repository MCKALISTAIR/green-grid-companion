import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

// PR-B1 city skyline art (Design brief §11, PLAN.md "PR-B1 decisions"):
// - London keeps its set (dome, clock tower, glass towers, Eye).
// - Generic cities: neutral GB skyline with a church spire; no domes.
// - Edinburgh: the neutral set with Edinburgh Castle on its rock in the far layer.
// - Very-clean (NESO 'very low') hero: London Eye; the castle or the spire get a
//   static warm rim light (or lit windows at night).
// Everything is mocked, the service worker is blocked, and both the page clock
// and the mock data clock are pinned to the same instant so readings are fresh.
// Set B1_SHOTS=1 to write the PR screenshots into docs/pr-shots/b1/.
test.use({ serviceWorkers: 'block' });

const SHOTS = Boolean(process.env.B1_SHOTS);

// 23 Oct 2026. The postcode mock geocodes everything to EH1 (55.95N), so sun
// times are Edinburgh's: sunrise ~07:52, sunset ~17:53 BST.
const TIMES = {
  midday: '2026-10-23T12:55:00+01:00',
  dusk: '2026-10-23T18:40:00+01:00',
  night: '2026-10-23T21:30:00+01:00',
} as const;
type Slot = keyof typeof TIMES;

const realNow = Date.now.bind(Date);
function pinNodeClock(iso: string) {
  const offset = new Date(iso).getTime() - realNow();
  Date.now = () => realNow() + offset;
}
test.afterEach(() => {
  Date.now = realNow;
});

async function openCity(
  page: Page,
  postcode: string,
  slot: Slot,
  { viewport = { width: 390, height: 844 }, veryClean = false } = {},
) {
  pinNodeClock(TIMES[slot]);
  await page.clock.install({ time: new Date(TIMES[slot]) });
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installMocks(
    page.context(),
    veryClean
      ? { intensity: 32, index: 'very low', ageMinutes: 5 }
      : { intensity: 100, index: 'low', ageMinutes: 5 },
  );
  await page.context().addInitScript(seedStorage({ postcode }));
  await page.goto('/');
  const scene = page.getByRole('region', { name: /Animated landscape/ });
  await expect(scene).toBeVisible({ timeout: 30_000 });
  await expect(scene).toHaveAttribute('data-scene-type', 'city');
  return scene;
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.waitForTimeout(2500); // let the intro fades settle
  const { width, height } = page.viewportSize()!;
  await page.screenshot({ path: `docs/pr-shots/b1/${name}-${width}x${height}.png` });
}

const BANNED_IN_NEUTRAL = [
  'dome',
  'london-eye',
  'clock-tower',
  'glass-tower-far',
  'glass-tower-near',
];

async function cityArt(scene: ReturnType<Page['getByRole']>) {
  return scene
    .locator('[data-city-art]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-city-art')));
}
async function landmarks(scene: ReturnType<Page['getByRole']>) {
  return scene
    .locator('[data-city-landmark]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-city-landmark')));
}

// Mobile first: 390x844, then 320x568 and 375x667. PR shots cover 390 and 320.
const VIEWPORTS = SHOTS
  ? [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ]
  : [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
      { width: 375, height: 667 },
    ];

const CITIES = [
  { postcode: 'SW1A', variant: 'london', name: 'london-sw1a' },
  { postcode: 'EH1', variant: 'edinburgh', name: 'edinburgh-eh1' },
  { postcode: 'M1', variant: 'generic', name: 'generic-m1' },
] as const;

for (const viewport of VIEWPORTS) {
  const size = `${viewport.width}x${viewport.height}`;
  for (const city of CITIES) {
    for (const slot of SHOTS ? (['midday', 'dusk', 'night'] as const) : (['midday'] as const)) {
      test(`${city.name} skyline at ${slot}, ${size}`, async ({ page }) => {
        test.setTimeout(90_000);
        const scene = await openCity(page, city.postcode, slot, { viewport });
        await expect(scene.locator(`[data-city-variant="${city.variant}"]`)).toHaveCount(1);
        const art = await cityArt(scene);
        const lms = await landmarks(scene);
        if (city.variant === 'london') {
          expect(lms).toContain('dome');
          expect(lms).toContain('london-eye');
          expect(art).not.toContain('edinburgh-castle');
        } else {
          for (const b of BANNED_IN_NEUTRAL) expect(lms).not.toContain(b);
          expect(art).toContain('church-spire');
          expect(art).toContain('terrace');
          expect(art.includes('edinburgh-castle')).toBe(city.variant === 'edinburgh');
          expect(art.includes('neutral-tower')).toBe(city.variant === 'generic');
          await expect(scene.locator('[data-landmark-hero="lit"]')).toHaveCount(0);
        }
        await shot(page, `${city.name}-${slot}`);
      });
    }

    test(`${city.name} very-clean hero, ${size}`, async ({ page }) => {
      test.setTimeout(90_000);
      const scene = await openCity(page, city.postcode, 'midday', { viewport, veryClean: true });
      if (city.variant === 'london') {
        await expect(scene.locator('[data-city-landmark="london-eye"]')).toHaveCount(1);
      } else {
        const hero = city.variant === 'edinburgh' ? 'edinburgh-castle' : 'church-spire';
        await expect(
          scene.locator(`[data-city-art="${hero}"][data-landmark-hero="lit"]`),
        ).toHaveCount(1);
        await expect(scene.locator('[data-landmark-hero="lit"]')).toHaveCount(1);
      }
      await shot(page, `${city.name}-very-clean`);
    });
  }

  test(`edinburgh-eh1 very-clean hero at night, ${size}`, async ({ page }) => {
    test.setTimeout(90_000);
    const scene = await openCity(page, 'EH1', 'night', { viewport, veryClean: true });
    await expect(
      scene.locator('[data-city-art="edinburgh-castle"][data-landmark-hero="lit"]'),
    ).toHaveCount(1);
    await shot(page, 'edinburgh-eh1-very-clean-night');
  });
}

test('the new city art uses no CSS filter or blur', async ({ page }) => {
  test.setTimeout(90_000);
  for (const city of CITIES.slice(1)) {
    const scene = await openCity(page, city.postcode, 'dusk');
    const filtered = await scene.locator('[data-city-art]').evaluateAll((els) =>
      els.flatMap((el) =>
        [el, ...el.querySelectorAll('*')]
          .filter((n) => {
            const f = getComputedStyle(n).filter;
            return (f && f !== 'none') || n.hasAttribute('filter');
          })
          .map((n) => n.tagName),
      ),
    );
    expect(filtered).toEqual([]);
  }
});
