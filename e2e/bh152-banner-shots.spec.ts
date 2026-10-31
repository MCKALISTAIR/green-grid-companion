import { expect, test } from '@playwright/test';
import { FAKE_KEY, openSheet, scenario, setup } from './octopus-link.helpers';
import { OCTOPUS_BANNER_COPY } from '../src/lib/voice/octopusLinkCopy';

// BH-152 already-linked banner for Design/PR review. Fully mocked; Octopus is
// never called. Opt-in: PR_SHOTS=1 npx playwright test e2e/bh152-banner-shots.spec.ts
test.skip(!process.env.PR_SHOTS, 'set PR_SHOTS=1 to capture docs/pr-shots/bh152');
test.use({ serviceWorkers: 'block' });
test.setTimeout(90_000);

for (const vp of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`meter already linked banner ${vp.width}x${vp.height}`, async ({ page, context }) => {
    await page.setViewportSize(vp);
    const sc = scenario({
      getMeters: () => ({
        body: {
          error: 'That meter is already linked to another account.',
          code: 'meter_already_linked',
          meters: [],
        },
      }),
    });
    await setup(page, context, sc);
    await openSheet(page);
    await page.locator('#account-number').fill('A-12AB34CD');
    await page.locator('#api-key').fill(FAKE_KEY);
    await page.getByTestId('octopus-link-submit').click();
    const banner = page.getByTestId('octopus-link-banner');
    await expect(banner).toContainText(OCTOPUS_BANNER_COPY.meterTaken);
    await banner.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `docs/pr-shots/bh152/banner-meter-taken-${vp.width}x${vp.height}.png`,
    });
  });
}
