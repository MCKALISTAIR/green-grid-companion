import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage, SCENARIOS } from '../scripts/layout/mock-api.mjs';

// Inner portrait (Duo unfolded, 669x902): the forecast badge stacks under the
// band line, and the renewable pill has a solid backing and sits clear of the
// skyline. Other sizes keep their own rules.
test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

async function open(page: Page, width: number, height: number, scenario: string) {
  await page.setViewportSize({ width, height });
  await installMocks(page.context(), SCENARIOS[scenario]);
  await page.context().addInitScript(seedStorage({}));
  await page.goto('/');
  await expect(page.getByTestId('hero-meta')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(800);
}

const measure = (page: Page) =>
  page.evaluate(() => {
    const r = (sel: string) => document.querySelector(sel)?.getBoundingClientRect();
    const sky = [
      ...document.querySelectorAll(
        '[data-city-art="terrace"], [data-city-art$="-front"], [data-city-art="edinburgh-castle"]',
      ),
    ]
      .map((e) => e.getBoundingClientRect())
      .filter((x) => x.width > 0);
    const meta = document.querySelector('[data-testid="hero-meta"]')!;
    return {
      bandBottom: r('[data-testid="hero-band"]')!.bottom,
      badgeTop: r('[data-testid="zero-carbon-badge"]')?.top ?? null,
      metaBottom: meta.getBoundingClientRect().bottom,
      metaBg: getComputedStyle(meta).backgroundColor,
      skyTop: Math.min(...sky.map((x) => x.top)),
    };
  });

for (const scenario of ['zero-carbon', 'very-high']) {
  test(`669x902 hero stack, ${scenario}`, async ({ page }) => {
    await open(page, 669, 902, scenario);
    const m = await measure(page);
    if (scenario === 'zero-carbon') {
      // The forecast badge is below the band line, not beside it.
      expect(m.badgeTop).not.toBeNull();
      expect(m.badgeTop!).toBeGreaterThanOrEqual(m.bandBottom - 1);
    }
    // Solid (opaque) pill backing.
    expect(m.metaBg).toMatch(/^rgb\(/);
    // The pill sits above the skyline.
    expect(m.metaBottom).toBeLessThanOrEqual(m.skyTop);
  });
}
