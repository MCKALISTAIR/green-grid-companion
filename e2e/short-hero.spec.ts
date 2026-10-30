import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage, SCENARIOS } from '../scripts/layout/mock-api.mjs';

// D-05 (Design call): at heights of 640px or less the hero is compact. The
// renewable pill sits in the hero stack directly under the band line with a
// solid backing (never over the skyline), and the first card's title peeks
// above the bottom nav on first view. Taller screens keep the old layout.
test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

const SIZES = [
  { width: 382, height: 618 },
  { width: 385, height: 609 },
  { width: 320, height: 568 },
];

async function open(page: Page, scenario: string, size: { width: number; height: number }) {
  await page.setViewportSize(size);
  await installMocks(page.context(), SCENARIOS[scenario]);
  await page.context().addInitScript(seedStorage({}));
  if (size.width !== 320) {
    // iPhone portrait safe areas (59 top / 34 bottom).
    const cdp = await page.context().newCDPSession(page);
    await cdp.send(
      'Emulation.setSafeAreaInsetsOverride' as never,
      {
        insets: { top: 59, bottom: 34, left: 0, right: 0 },
      } as never,
    );
  }
  await page.goto('/');
  await expect(page.getByTestId('hero-meta')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(800);
}

for (const scenario of ['zero-carbon', 'very-high']) {
  for (const size of SIZES) {
    test(`compact hero, ${scenario} ${size.width}x${size.height}`, async ({ page }) => {
      await open(page, scenario, size);
      const m = await page.evaluate(() => {
        const rect = (el: Element | null) => el?.getBoundingClientRect() ?? null;
        const meta = document.querySelector('[data-testid="hero-meta"]')!;
        const band = rect(document.querySelector('[data-testid="hero-band"]'))!;
        const row = document.querySelector('[data-testid="hero-band-row"]')!;
        const nav = rect(document.querySelector('[data-testid="bottom-nav"]'))!;
        const panel = document.querySelector('.home-feed [role="tabpanel"]');
        const title = rect(panel?.querySelector('h2, h3') ?? null);
        const sky = [
          ...document.querySelectorAll(
            '[data-city-art="terrace"], [data-city-art$="-front"], [data-city-art="edinburgh-castle"]',
          ),
        ]
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.width > 0);
        const bg = getComputedStyle(meta).backgroundColor;
        return {
          inRow: row.contains(meta),
          short: meta.getAttribute('data-short-hero'),
          bg,
          metaTop: meta.getBoundingClientRect().top,
          metaBottom: meta.getBoundingClientRect().bottom,
          bandBottom: band.bottom,
          skyTop: Math.min(...sky.map((r) => r.top)),
          navTop: nav.top,
          titleTop: title?.top ?? null,
          titleBottom: title?.bottom ?? null,
        };
      });
      expect(m.inRow).toBe(true);
      expect(m.short).toBe('true');
      // Solid backing: an opaque colour, not a translucent glass.
      const alpha = m.bg.startsWith('rgba') ? Number(m.bg.split(',')[3].replace(')', '')) : 1;
      expect(alpha).toBe(1);
      // Directly under the band line.
      expect(m.metaTop).toBeGreaterThanOrEqual(m.bandBottom - 1);
      expect(m.metaTop - m.bandBottom).toBeLessThan(16);
      // Never over the skyline.
      expect(m.metaBottom).toBeLessThanOrEqual(m.skyTop);
      // First card's title peeks above the nav.
      expect(m.titleTop).not.toBeNull();
      expect(m.titleBottom!).toBeLessThanOrEqual(m.navTop);
    });
  }
}

test('390x844 keeps the regular hero', async ({ page }) => {
  await open(page, 'zero-carbon', { width: 390, height: 844 });
  const meta = page.getByTestId('hero-meta');
  await expect(meta).not.toHaveAttribute('data-short-hero', 'true');
  expect(
    await page.evaluate(() =>
      document
        .querySelector('[data-testid="hero-band-row"]')!
        .contains(document.querySelector('[data-testid="hero-meta"]')),
    ),
  ).toBe(false);
});
