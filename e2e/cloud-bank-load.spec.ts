import { test, expect, type BrowserContext } from '@playwright/test';
import { installMocks, seedStorage, SCENARIOS } from '../scripts/layout/mock-api.mjs';

// G-11 (Design call): on a slow network the cloud bank is drawn at its reserved
// position (hero text bottom + 34) from the first frame. When the weather lands it
// cross-fades in place over about 400ms; Reduce Motion swaps it instantly.
// Layout shift from the cloud bank stays at about 0.
test.use({ serviceWorkers: 'block' });

const API = /api\.carbonintensity\.org\.uk|supabase\.co\/functions|open-meteo/;

async function slowOvercast(context: BrowserContext) {
  await installMocks(context, {
    ...SCENARIOS['zero-carbon'],
    weather: { cloud_cover: 92, weather_code: 3 },
  });
  await context.route(API, async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.fallback();
  });
  await context.addInitScript(seedStorage({}));
  await context.addInitScript(() => {
    const w = window as unknown as {
      __frames: { t: number; banks: { v: string; top: number; op: number }[] }[];
      __bankCls: number;
    };
    w.__frames = [];
    w.__bankCls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as {
        value: number;
        hadRecentInput: boolean;
        sources?: { node?: Node | null }[];
      }[]) {
        if (e.hadRecentInput) continue;
        const hit = (e.sources ?? []).some((s) => {
          const el = s.node instanceof Element ? s.node : s.node?.parentElement;
          return !!el?.closest('[data-art="cloud-bank"],[data-bank-fade]');
        });
        if (hit) w.__bankCls += e.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    const tick = () => {
      const banks = [...document.querySelectorAll<HTMLElement>('[data-art="cloud-bank"]')].map(
        (el) => {
          const fade = el.closest<HTMLElement>('[data-bank-fade]');
          return {
            v: el.dataset.variant ?? '-',
            top: Math.round(el.getBoundingClientRect().top),
            op: fade ? Number(getComputedStyle(fade).opacity) : 1,
          };
        },
      );
      if (banks.length) w.__frames.push({ t: performance.now(), banks });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

for (const reduced of [false, true]) {
  test(`cloud bank holds its place and ${reduced ? 'swaps instantly (Reduce Motion)' : 'cross-fades'} when weather lands`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 382, height: 618 },
      serviceWorkers: 'block',
      reducedMotion: reduced ? 'reduce' : 'no-preference',
    });
    await slowOvercast(context);
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('[data-art="cloud-bank"][data-variant="below-text"]')).toHaveCount(
      1,
      { timeout: 15000 },
    );
    await page.waitForTimeout(1200);
    const { frames, cls } = await page.evaluate(() => {
      const w = window as unknown as {
        __frames: { t: number; banks: { v: string; top: number; op: number }[] }[];
        __bankCls: number;
      };
      return { frames: w.__frames, cls: w.__bankCls };
    });
    expect(frames.length).toBeGreaterThan(0);
    // Every bank, in every frame, sits at the same top as the very first frame.
    const firstTop = frames[0].banks[0].top;
    expect(frames[0].banks[0].v).toBe('unknown-weather');
    for (const f of frames) for (const b of f.banks) expect(b.top).toBe(firstTop);
    // Cross-fade: both banks are on screen together, at partial opacity, for about 400ms.
    const both = frames.filter((f) => f.banks.length === 2);
    const partial = frames.flatMap((f) => f.banks).filter((b) => b.op > 0.05 && b.op < 0.95);
    if (reduced) {
      expect(partial).toHaveLength(0);
    } else {
      expect(both.length).toBeGreaterThan(3);
      const span = both[both.length - 1].t - both[0].t;
      expect(span).toBeGreaterThan(250);
      expect(span).toBeLessThan(700);
      expect(partial.length).toBeGreaterThan(0);
    }
    expect(cls).toBeLessThan(0.001);
    await context.close();
  });
}
