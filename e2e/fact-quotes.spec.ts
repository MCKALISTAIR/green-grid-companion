import { test, expect, type Page } from '@playwright/test';
import { installMocks, seedStorage, SCENARIOS } from '../scripts/layout/mock-api.mjs';
import { ENERGY_FACTS } from '../src/lib/energyFacts';

// The fun-fact line under the sheet handle: plain italic text, no stray quote
// marks, and the fact text exactly as written.
test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

const FACTS = new Set(ENERGY_FACTS.map((f) => f.text));

async function open(page: Page, width: number, height: number, scenario: string) {
  await page.setViewportSize({ width, height });
  await installMocks(page.context(), SCENARIOS[scenario]);
  await page.context().addInitScript(seedStorage({}));
  await page.goto('/');
  await expect(page.getByTestId('hero-meta')).toBeVisible({ timeout: 30_000 });
}

for (const scenario of ['zero-carbon', 'very-high']) {
  test(`669x902 fact line has no quote glyphs, ${scenario}`, async ({ page }) => {
    await open(page, 669, 902, scenario);
    const line = page.locator('.home-feed-fact p').first();
    await expect(line).toBeVisible();
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const p = page.locator('.home-feed-fact p').first();
      const text = ((await p.textContent()) ?? '').trim();
      expect(FACTS.has(text), `unknown fact text: ${text}`).toBe(true);
      expect(text).not.toMatch(/["„“”]/);
      expect(await p.evaluate((e) => getComputedStyle(e).fontStyle)).toBe('italic');
      seen.add(text);
      await page.locator('.home-feed-fact [role="button"]').first().dispatchEvent('click');
      await page.waitForTimeout(300);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
}

test('382x618 keeps the fact line hidden (short screen)', async ({ page }) => {
  await open(page, 382, 618, 'zero-carbon');
  await expect(page.locator('.home-feed-fact')).toBeHidden();
});
