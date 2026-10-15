#!/usr/bin/env node
/**
 * Layout regression guard (CI). Builds nothing itself: serves the existing
 * production build (dist/) with `vite preview`, mocks every external API
 * (scripts/layout/mock-api.mjs) and asserts:
 *   1. hero: location header, zero-carbon badge, big number and band label never
 *      intersect (zero-carbon, stale and long-region states, 5 viewports); the
 *      badge shows for a fresh 0 g reading and is hidden when stale;
 *   2. the scalloped sheet edge spans the full width with no gap at either edge;
 *      at 320x568 the compact hero must also keep the % renewable / updated row
 *      visible, clear of the text above it and of the sheet;
 *   3. key routes don't leave empty scroll space below their last content, and
 *      that content scrolls fully clear of the bottom nav;
 *   4. every bottom-nav tab page (Home, Plan, History, Rank, Settings) scrolls its
 *      last item fully above the nav, with at least TAB_MIN_CLEARANCE px to spare,
 *      at every guard viewport plus the short phones in TAB_EXTRA_VIEWPORTS.
 *
 * Usage: npm run build && node scripts/layout-guard.mjs
 *   BASE_URL=http://localhost:4302  use an already running server
 *   PW_CHROMIUM=/usr/bin/google-chrome  use a system Chrome instead of Playwright's
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installMocks, seedStorage, SCENARIOS } from './layout/mock-api.mjs';
import { GUARD_VIEWPORTS, checkHero, checkSheetEdge, checkScrollSpace } from './layout/checks.mjs';

const PORT = 4183;
const HERO_STATES = [
  { scenario: 'zero-carbon', expectBadge: true },
  { scenario: 'stale', expectBadge: false },
  { scenario: 'long-region', expectBadge: true },
];
/** Short phones (iPhone SE 1st gen): compact hero must keep every line visible. */
const COMPACT_HERO_VIEWPORTS = [{ width: 320, height: 568 }];

const SCROLL_ROUTES = [
  '/history',
  '/settings',
  '/achievements',
  '/help',
  '/glossary',
  '/terms',
  '/planner',
  '/map',
  '/locations',
];

/** Every route in BottomNav. Clearance comes from --bottom-content-inset (index.css). */
const TAB_ROUTES = ['/', '/planner', '/history', '/map', '/settings'];
/** Small phones checked for tab clearance only (iPhone SE 1st gen). */
const TAB_EXTRA_VIEWPORTS = [{ width: 320, height: 568 }];
const TAB_MIN_CLEARANCE = 8;

async function startPreview() {
  // Run vite's own bin with node (not `npx`): killing an npx wrapper left the vite
  // grandchild alive holding our pipes, so the script never exited in CI. Own
  // process group so we can kill the whole tree.
  const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
  const proc = spawn(
    process.execPath,
    [viteBin, 'preview', '--port', String(PORT), '--strictPort'],
    {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: process.env,
      detached: true,
    },
  );
  proc.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));
  const stop = () => {
    try {
      process.kill(-proc.pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
  };
  const url = `http://localhost:${PORT}`;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return { stop, url };
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  stop();
  throw new Error('vite preview did not start within 30s');
}

async function openPage(browser, base, { viewport, scenario, route = '/' }) {
  const context = await browser.newContext({
    viewport,
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  });
  await installMocks(context, SCENARIOS[scenario]);
  await context.addInitScript(seedStorage());
  const page = await context.newPage();
  await page.goto(base + route, { waitUntil: 'domcontentloaded' });
  return { context, page };
}

async function waitForHero(page) {
  await page
    .waitForFunction(
      () =>
        /gCO₂|Very Low|Very High/.test(
          document.querySelector('.home-scene-gauge')?.textContent || '',
        ),
      null,
      { timeout: 15000 },
    )
    .catch(() => {});
  await page.waitForTimeout(1500); // badge entrance + band typewriter
}

async function main() {
  const external = process.env.BASE_URL;
  const server = external ? null : await startPreview();
  const base = external || server.url;
  const browser = await chromium.launch(
    process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  );
  const failures = [];
  let checks = 0;
  try {
    for (const viewport of GUARD_VIEWPORTS) {
      for (const st of HERO_STATES) {
        const { context, page } = await openPage(browser, base, {
          viewport,
          scenario: st.scenario,
        });
        await waitForHero(page);
        failures.push(
          ...(await checkHero(page, {
            ...st,
            viewport,
            region: SCENARIOS[st.scenario].regionName ?? 'South Scotland',
          })),
        );
        if (st.scenario === 'zero-carbon')
          failures.push(...(await checkSheetEdge(page, { viewport })));
        checks++;
        await context.close();
      }
      for (const route of new Set([...SCROLL_ROUTES, ...TAB_ROUTES])) {
        const { context, page } = await openPage(browser, base, {
          viewport,
          scenario: 'zero-carbon',
          route,
        });
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(1500);
        const minClearance = TAB_ROUTES.includes(route) ? TAB_MIN_CLEARANCE : 0;
        failures.push(...(await checkScrollSpace(page, { route, viewport, minClearance })));
        checks++;
        await context.close();
      }
    }
    for (const viewport of TAB_EXTRA_VIEWPORTS) {
      for (const route of TAB_ROUTES) {
        const { context, page } = await openPage(browser, base, {
          viewport,
          scenario: 'zero-carbon',
          route,
        });
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(1500);
        failures.push(
          ...(await checkScrollSpace(page, { route, viewport, minClearance: TAB_MIN_CLEARANCE })),
        );
        checks++;
        await context.close();
      }
    }
    for (const viewport of COMPACT_HERO_VIEWPORTS) {
      for (const st of HERO_STATES) {
        const { context, page } = await openPage(browser, base, {
          viewport,
          scenario: st.scenario,
        });
        await waitForHero(page);
        failures.push(
          ...(await checkHero(page, {
            ...st,
            expectMeta: true,
            viewport,
            region: SCENARIOS[st.scenario].regionName ?? 'South Scotland',
          })),
        );
        if (st.scenario === 'zero-carbon')
          failures.push(...(await checkSheetEdge(page, { viewport })));
        checks++;
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server?.stop();
  }
  if (failures.length) {
    console.error(
      `\nLayout guard: ${failures.length} failure(s) in ${checks} page checks:\n` +
        failures.map((f) => `  ✗ ${f}`).join('\n'),
    );
    process.exit(1);
  }
  console.log(`Layout guard: ${checks} page checks passed.`);
  process.exit(0); // don't let a stray handle keep CI waiting
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
