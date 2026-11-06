import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installMocks, seedStorage, SCENARIOS } from '../scripts/layout/mock-api.mjs';

// Polish pass: the forecast chart's "Values in gCO2/kWh" line (3.57:1 light) and the
// Planner appliance sub-labels (3.72:1 light) were under WCAG AA 4.5:1.
// axe color-contrast must pass on those routes in both themes.
test.use({ serviceWorkers: 'block' });

for (const theme of ['light', 'dark'] as const) {
  for (const route of ['/', '/planner']) {
    test(`text contrast on ${route} (${theme})`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        serviceWorkers: 'block',
        reducedMotion: 'reduce',
        colorScheme: theme,
      });
      await installMocks(context, SCENARIOS['zero-carbon']);
      await context.addInitScript(seedStorage({ theme }));
      const page = await context.newPage();
      await page.goto(route);
      await page.waitForTimeout(4000);
      const res = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
      const nodes = res.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')));
      expect(nodes).toEqual([]);
      await context.close();
    });
  }
}

// Design copy call: the forecast legend uses Home's sentence-case band names.
test('forecast legend uses sentence case band names', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 382, height: 618 },
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  });
  await installMocks(context, SCENARIOS['zero-carbon']);
  await context.addInitScript(seedStorage({}));
  const page = await context.newPage();
  await page.goto('/');
  const items = page.getByTestId('forecast-legend-item');
  await expect(items).toHaveCount(5, { timeout: 15000 });
  await expect(items).toHaveText(['Very low', 'Low', 'Moderate', 'High', 'Very high']);
  await context.close();
});
