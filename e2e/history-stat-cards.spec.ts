import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

// History stat cards: toggling 24h <-> 7d must not move the chart (the 24h
// Trend value used to wrap "10 gCO2/kWh" onto two lines and grow the cards).
// Data: NESO's real South Scotland forecasts for 23-30 Oct 2026 (the week in
// the bug report), re-based to now. 7d average 2 g, 24h average 7 g, 24h
// trend 12 -> 2 g. SHOTS=<dir> also saves screenshots of both toggles.
test.use({ serviceWorkers: 'block' });
test.setTimeout(90_000);

const WEEK: number[] = JSON.parse(
  readFileSync(new URL('./fixtures/history-south-scotland-7d.json', import.meta.url), 'utf8'),
);

async function mockHistory(page: Page) {
  await page.context().route(/regional\/intensity\/[^/]+\/[^/]+\/regionid\/\d+/, (route) => {
    const m = route
      .request()
      .url()
      .match(/intensity\/([^/]+)\/([^/]+)\/regionid/)!;
    const from = Date.parse(decodeURIComponent(m[1]));
    const to = Date.parse(decodeURIComponent(m[2]));
    const slots = Math.min(WEEK.length, Math.round((to - from) / 1800000));
    const end = Math.floor(to / 1800000) * 1800000;
    const vals = WEEK.slice(WEEK.length - slots);
    const data = vals.map((v, i) => {
      const f = end - (slots - i) * 1800000;
      const iso = (t: number) => new Date(t).toISOString().replace(/\.\d+Z$/, 'Z');
      return {
        from: iso(f),
        to: iso(f + 1800000),
        intensity: { forecast: v, index: 'very low' },
        generationmix: [{ fuel: 'wind', perc: 100 }],
      };
    });
    return route.fulfill({
      json: { data: { regionid: 2, shortname: 'South Scotland', data } },
    });
  });
}

for (const vp of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`chart stays put when toggling 24h/7d at ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await installMocks(page.context(), { intensity: 2, regionName: 'South Scotland' });
    await mockHistory(page);
    await page.context().addInitScript(seedStorage());
    await page.addInitScript(() => localStorage.setItem('history-chart-tip-seen', 'true'));
    await page.goto('/history');
    const trend = page.getByTestId('history-trend-value');
    await expect(trend).toBeVisible({ timeout: 20_000 });
    const chartTop = () =>
      page
        .getByRole('heading', { name: /-(hour|day) view/ })
        .or(page.getByText(/^(24-hour|7-day) view$/))
        .first()
        .evaluate((el) => Math.round(el.getBoundingClientRect().top + scrollY));
    // The number must sit on one line (Alistair's 24h shot wrapped "10 gCO2/kWh").
    const oneLine = async () => {
      const lines = await trend.evaluate((el) => {
        const lh = parseFloat(getComputedStyle(el).lineHeight);
        return Math.round(el.getBoundingClientRect().height / lh);
      });
      expect(lines).toBe(1);
    };
    const cardsH = () =>
      trend.evaluate((el) => Math.round(el.closest('.grid')!.getBoundingClientRect().height));
    const btn = (n: string) => page.getByRole('button', { name: n, exact: true });
    const shots = process.env.SHOTS;
    const snap = async (r: string) => {
      await page.waitForTimeout(800);
      if (shots)
        await page.screenshot({ path: `${shots}/history-${r}-${vp.width}x${vp.height}.png` });
    };

    await expect(trend).toHaveText(/^4(\s|$)/); // 7d: 6 -> 2
    await snap('7d');
    await oneLine();
    const h7d = await cardsH();
    const top7d = await chartTop();
    await btn('24h').click();
    await expect(trend).toHaveText(/^10(\s|$)/); // 24h: 12 -> 2
    await snap('24h');
    await oneLine();
    const h24h = await cardsH();
    const top24h = await chartTop();
    await btn('7d').click();
    await expect(trend).toHaveText(/^4(\s|$)/);
    const back = await chartTop();
    console.log(
      `${vp.width}x${vp.height} cards 7d=${h7d} 24h=${h24h}; chart top 7d=${top7d} 24h=${top24h} back=${back}`,
    );
    expect(h24h).toBe(h7d);
    expect(top24h).toBe(top7d);
    expect(back).toBe(top7d);
  });
}
