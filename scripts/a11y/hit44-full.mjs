// Full-page 44pt hit-area check: scrolls each sub-44 control into view and probes ±21px with elementFromPoint.
// Usage: node scripts/a11y/hit44-full.mjs <baseUrl> [out.json]
import { chromium } from 'playwright';
import { installMocks, seedStorage, SCENARIOS } from '../layout/mock-api.mjs';
const base = process.argv[2];
const b = await chromium.launch();
const all = {};
for (const vp of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
])
  for (const route of [
    '/',
    '/planner',
    '/history',
    '/map',
    '/settings',
    '/help',
    '/glossary',
    '/achievements',
    '/support',
    '/onboarding',
  ]) {
    const ctx = await b.newContext({
      viewport: vp,
      reducedMotion: 'reduce',
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'block',
    });
    await installMocks(ctx, SCENARIOS[Object.keys(SCENARIOS)[0]]);
    await ctx.addInitScript(seedStorage({}));
    if (route === '/onboarding')
      await ctx.addInitScript(() => localStorage.removeItem('onboarding_complete'));
    const p = await ctx.newPage();
    await p.goto(base + route);
    await p.waitForTimeout(3000);
    const n = await p.evaluate(
      () =>
        document.querySelectorAll(
          'button,a[href],[role=button],[role=switch],[role=radio],[role=tab],[role=checkbox],[role=link]',
        ).length,
    );
    const bad = [];
    for (let i = 0; i < n; i++) {
      const res = await p.evaluate(async (i) => {
        const e = document.querySelectorAll(
          'button,a[href],[role=button],[role=switch],[role=radio],[role=tab],[role=checkbox],[role=link]',
        )[i];
        if (!e) return null;
        const cs = getComputedStyle(e);
        if (cs.visibility === 'hidden' || e.closest('[aria-hidden=true],[inert]')) return null;
        let r = e.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        if (r.width >= 44 && r.height >= 44) return null;
        e.scrollIntoView({ block: 'center', inline: 'center' });
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        r = e.getBoundingClientRect();
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
        if (hits.every(Boolean)) return null;
        return `${(e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 40)} ${Math.round(r.width)}x${Math.round(r.height)} hits=${hits.map(Number).join('')}`;
      }, i);
      if (res) bad.push(res);
    }
    all[`${vp.width} ${route}`] = bad;
    if (bad.length) console.log(vp.width, route, JSON.stringify(bad));
    await ctx.close();
  }
const fs = await import('fs');
fs.writeFileSync(process.argv[3] || '/tmp/hit44-full.json', JSON.stringify(all, null, 1));
await b.close();
