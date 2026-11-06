import { test, expect } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

const SIZES = [
  { width: 382, height: 618 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];
for (const size of SIZES) {
  test(`tall sheet top detent at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.addInitScript(() => {
      Date.now = () => Date.parse('2026-10-30T12:00:00Z');
    });
    await installMocks(page.context());
    await page.context().addInitScript(seedStorage());
    await page.goto('/');
    await page.getByRole('button', { name: /View South Scotland generation mix details/ }).click();
    const sheet = page.getByTestId('responsive-sheet');
    await expect(sheet).toBeVisible();
    await page.waitForTimeout(800);
    const grabber = page.getByTestId('sheet-grabber');
    const grabBox = await grabber.boundingBox();
    const x = grabBox.x + grabBox.width / 2;
    const y = grabBox.y + grabBox.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, 30, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(1000);
    const scroller = sheet.locator(':scope > div.overflow-y-auto');
    await scroller.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(scroller).toHaveJSProperty(
      'scrollTop',
      await scroller.evaluate((el) => el.scrollHeight - el.clientHeight),
    );
    const top = await sheet.boundingBox();
    await page.screenshot({
      path: `docs/polish/tall-sheets/${process.env.BH121_PREFIX ?? 'after'}-${size.width}x${size.height}.png`,
    });
    expect(top.y).toBeGreaterThanOrEqual(0);
    expect(top.y + top.height).toBeLessThanOrEqual(size.height + 1);
    const footerClose = sheet
      .getByRole('button', { name: 'Close', exact: true })
      .filter({ visible: true })
      .last();
    const footerBox = await footerClose.boundingBox();
    expect(footerBox.y).toBeGreaterThanOrEqual(0);
    expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(size.height + 1);
    await footerClose.click();
    await expect(sheet).not.toBeAttached();
  });
}
