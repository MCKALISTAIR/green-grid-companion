import { chromium } from 'playwright';
import { installMocks, seedStorage, SCENARIOS } from '../layout/mock-api.mjs';
const base = process.argv[2];
const b = await chromium.launch();
for (const vp of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
])
  for (const route of [
    '/',
    '/planner',
    '/history',
    '/settings',
    '/help',
    '/glossary',
    '/achievements',
  ]) {
    const ctx = await b.newContext({ viewport: vp, reducedMotion: 'reduce' });
    await installMocks(ctx, SCENARIOS[Object.keys(SCENARIOS)[0]]);
    await ctx.addInitScript(seedStorage({}));
    const p = await ctx.newPage();
    await p.goto(base + route);
    await p.waitForTimeout(3000);
    const bad = await p.evaluate(() => {
      const out = [];
      const els = [
        ...document.querySelectorAll(
          'button,a[href],[role=button],[role=switch],[role=radio],[role=tab],[role=checkbox]',
        ),
      ];
      for (const e of els) {
        const r = e.getBoundingClientRect();
        if (
          !r.width ||
          !r.height ||
          r.bottom < 0 ||
          r.top > innerHeight ||
          getComputedStyle(e).visibility === 'hidden'
        )
          continue;
        if (r.width >= 44 && r.height >= 44) continue;
        const cx = r.left + r.width / 2,
          cy = r.top + r.height / 2;
        const hits = [
          [cx, cy - 21],
          [cx, cy + 21],
          [cx - 21, cy],
          [cx + 21, cy],
        ].map(([x, y]) => {
          const h = document.elementFromPoint(x, y);
          return !!h && (h === e || e.contains(h));
        });
        if (hits.some((x) => !x))
          out.push(
            `${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)} hits=${hits.map(Number).join('')}`,
          );
      }
      return out;
    });
    if (bad.length) console.log(vp.width, route, JSON.stringify(bad));
    await ctx.close();
  }
await b.close();
