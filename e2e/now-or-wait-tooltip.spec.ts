import { test, expect } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

// The "Now or wait" first-run tip must never cover the card it explains: it sits
// above or below the card (flipping when there isn't room), inside the viewport,
// and the card stays fully visible above the bottom nav.
// Set TOUR_SHOTS=<dir> to save a screenshot per size.
test.use({ serviceWorkers: 'block' });

const SIZES = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 720, height: 540 },
  { width: 280, height: 653 },
  { width: 344, height: 882 },
];

for (const viewport of SIZES) {
  test(`now-or-wait tip clears its card at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await installMocks(page.context(), { intensity: 120, index: 'moderate', ageMinutes: 5 });
    await page.context().addInitScript(seedStorage({ postcode: 'EH1' }));
    await page.context().addInitScript(() => localStorage.removeItem('product_tour_seen'));
    await page.goto('/');

    const popover = page.locator('.driver-popover');
    await expect(popover).toBeVisible({ timeout: 30_000 });
    await popover.getByRole('button', { name: 'Next' }).click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Now or wait');
    await page.waitForTimeout(800); // scroll and popover animation settle

    const card = page.locator('[data-tour="now-or-wait"]').first();
    const c = (await card.boundingBox())!;
    const p = (await popover.boundingBox())!;
    if (process.env.TOUR_SHOTS) {
      await page.screenshot({
        path: `${process.env.TOUR_SHOTS}/now-or-wait-${viewport.width}x${viewport.height}.png`,
      });
    }

    const overlapX = Math.min(c.x + c.width, p.x + p.width) - Math.max(c.x, p.x);
    const overlapY = Math.min(c.y + c.height, p.y + p.height) - Math.max(c.y, p.y);
    expect(overlapX > 0 && overlapY > 0, 'tip overlaps its card').toBe(false);

    // The tip stays on screen.
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.x + p.width).toBeLessThanOrEqual(viewport.width);
    expect(p.y + p.height).toBeLessThanOrEqual(viewport.height);

    // The card is fully visible, above the bottom nav when there is one.
    const nav = page.locator('#bottom-nav');
    const navTop = (await nav.isVisible()) ? (await nav.boundingBox())!.y : viewport.height;
    expect(c.y).toBeGreaterThanOrEqual(0);
    expect(c.y + c.height).toBeLessThanOrEqual(navTop + 1);
  });
}
