import { expect, test } from '@playwright/test';
import { installMocks, seedStorage } from '../../scripts/layout/mock-api.mjs';

const defaultViewport: { width: number; height: number } = {
  width: Number(process.env.PHONE_WIDTH || 390),
  height: Number(process.env.PHONE_HEIGHT || 844),
};
const vpName = ({ width, height }: { width: number; height: number }) => `${width}x${height}`;

test('static first screen, including the JavaScript-free crawler view', async ({
  page,
  context,
}) => {
  await installMocks(context, { intensity: 88, index: 'low' });
  await context.addInitScript(seedStorage());

  if (process.env.PHONE_WIDTH === '360') await page.setViewportSize({ width: 360, height: 720 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Keep the static shell for this one QA screenshot; the subsequent check hands it to React.
  await context.route(/\/assets\/index-.*\.js$/, (route) => route.abort());
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Know when your electricity is cleanest.' }),
  ).toBeVisible();
  await expect(page.getByText('Loading', { exact: false })).toHaveCount(0);
  await page.screenshot({
    path: `docs/polish/static-first-screen/first-screen-${vpName(defaultViewport)}.png`,
    fullPage: false,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    test.info().project.use.viewport!.width!,
  );
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
    test.info().project.use.viewport!.height!,
  );
});

test('static screen hands off to the mocked live app', async ({ page, context }) => {
  await installMocks(context, { intensity: 88, index: 'low' });
  const seed = seedStorage({ skipSplash: false });
  await context.addInitScript(seed);
  await page.goto('/');
  await expect(page.locator('.home-scene-gauge')).toContainText('88', { timeout: 15000 });
  await expect(
    page.getByRole('heading', { name: 'Know when your electricity is cleanest.' }),
  ).toHaveCount(0);
});
