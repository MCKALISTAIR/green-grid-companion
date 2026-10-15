import { test, expect } from '@playwright/test';
import { checkScrollSpace } from '../scripts/layout/checks.mjs';

// Chromium reports no iOS env inset: override the shared safe-area token to
// exercise both an ordinary mobile browser and the 34px home-indicator inset.
for (const safeArea of [0, 34]) {
  test(`mobile content clears the dock with ${safeArea}px safe area`, async ({ page }) => {
    const viewport = { width: 390, height: 844 };
    await page.setViewportSize(viewport);
    await page.goto('/');
    if (page.url().includes('/onboarding')) {
      await page.getByRole('button', { name: 'Just show me the GB average' }).click();
    }
    await expect(page.getByRole('tab', { name: 'Demand', exact: true })).toBeVisible();
    const decline = page.getByRole('button', { name: 'Decline', exact: true });
    await decline.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await decline.isVisible()) await decline.click();
    await page.addStyleTag({ content: `:root { --bottom-safe-area: ${safeArea}px; }` });

    for (const view of ['Intensity', 'Demand', 'Footprint']) {
      await page.getByRole('tab', { name: view, exact: true }).click();
      await expect(page.getByRole('tabpanel', { name: view, exact: true })).toBeVisible();
      await page.waitForTimeout(1500);
      expect(await checkScrollSpace(page, { route: `/${view}`, viewport })).toEqual([]);
    }

    for (const route of ['/settings', '/planner', '/history']) {
      await page.goto(route);
      await expect(page.locator('.page-shell-inner').first()).toBeVisible();
      await page.addStyleTag({ content: `:root { --bottom-safe-area: ${safeArea}px; }` });
      await page.waitForTimeout(1500);
      expect(await checkScrollSpace(page, { route, viewport })).toEqual([]);
    }
  });
}