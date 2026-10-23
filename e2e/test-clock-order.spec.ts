import { test, expect } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';
import { pinClocks, restoreNodeClock } from './support/pinClocks';

// BH-113: a past instant must reach the page. Before the fix, pinning Node's
// Date.now before page.clock.install sent a past dawn to wall time, so it
// rendered as whatever time the suite ran at. pinClocks() installs the page
// clock first. 23 Oct 2026 08:00 BST is dawn in EH1 (sunrise ~07:52) and is in
// the past whenever this runs. Set BH113_SHOTS=<dir> to save the PR shots.
test.use({ serviceWorkers: 'block' });
test.afterEach(restoreNodeClock);

const DAWN = '2026-10-23T08:00:00+01:00';

// Mobile first: 390x844, then 320x568 and 375x667.
for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 375, height: 667 },
]) {
  const size = `${viewport.width}x${viewport.height}`;
  test(`past dawn renders as dawn, ${size}`, async ({ page }) => {
    await pinClocks(page, DAWN);
    expect(Math.abs(Date.now() - new Date(DAWN).getTime())).toBeLessThan(60_000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await installMocks(page.context(), { intensity: 100, index: 'low', ageMinutes: 5 });
    await page.context().addInitScript(seedStorage({ postcode: 'EH1' }));
    await page.goto('/');
    const scene = page.getByRole('region', { name: /Animated landscape/ });
    await expect(scene).toBeVisible({ timeout: 30_000 });
    const pageNow = await page.evaluate(() => Date.now());
    expect(Math.abs(pageNow - new Date(DAWN).getTime())).toBeLessThan(60_000);
    await expect(scene).toHaveAttribute('data-time-of-day', 'dawn');
    if (process.env.BH113_SHOTS) {
      await page.waitForTimeout(2500); // let the intro fades settle
      await page.screenshot({ path: `${process.env.BH113_SHOTS}/after-dawn-${size}.png` });
    }
  });
}
