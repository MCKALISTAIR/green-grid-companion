import { test } from '@playwright/test';
import { scenario, setup } from './octopus-link.helpers';

// PR-C1b: Changelog without the v1.1.0 Tesla entry, for Design review. Opt-in:
//   PR_SHOTS=1 npx playwright test e2e/c1b-shots.spec.ts
test.skip(!process.env.PR_SHOTS, 'set PR_SHOTS=1 to capture docs/pr-shots/pr-c1b');
test.use({ serviceWorkers: 'block' });
test.setTimeout(120_000);

for (const vp of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`changelog ${vp.width}x${vp.height}`, async ({ page, context }) => {
    await page.setViewportSize(vp);
    await setup(page, context, scenario());
    await page.goto('/changelog');
    const v100 = page.getByText('v1.0.0').first();
    await v100.waitFor({ timeout: 60_000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: `docs/pr-shots/pr-c1b/changelog-${vp.width}x${vp.height}.png`,
      fullPage: true,
    });
    await v100.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `docs/pr-shots/pr-c1b/changelog-v1.0.0-${vp.width}x${vp.height}.png`,
    });
  });
}
