#!/usr/bin/env node
/**
 * Viewport screenshot sweep. Serves a production build, mocks every external API
 * (scripts/layout/mock-api.mjs) and screenshots every route and the home screen's
 * major states at phone, tablet and desktop sizes. Also records layout findings
 * (overlaps, gaps, empty scroll space, horizontal overflow) as findings.json/md.
 *
 * Usage:
 *   node scripts/layout-sweep.mjs --base http://localhost:4302 --out /path/to/after
 *   PW_CHROMIUM=/usr/bin/google-chrome to use a system Chrome.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { installMocks, seedStorage, SCENARIOS } from './layout/mock-api.mjs';
import { GUARD_VIEWPORTS, checkHero, checkSheetEdge, checkScrollSpace } from './layout/checks.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://localhost:4173');
const OUT = arg('out', 'layout-sweep');
const ONLY = arg('only', '');
const CONCURRENCY = Number(arg('concurrency', '4'));

const VIEWPORTS = GUARD_VIEWPORTS;
const ODD_VIEWPORTS = [{ width: 320, height: 568 }, { width: 600, height: 900 }, { width: 1024, height: 768 }];
const vpName = (v) => `${v.width}x${v.height}`;

const HOME_STATES = {
  'zero-carbon': { scenario: 'zero-carbon' },
  'very-high': { scenario: 'very-high' },
  loading: { scenario: 'loading' },
  offline: { scenario: 'error', offline: true },
  error: { scenario: 'error' },
  stale: { scenario: 'stale' },
  'long-region': { scenario: 'long-region' },
  'long-postcode': { scenario: 'zero-carbon', postcode: 'EC1A 1BB' },
  'large-text': { scenario: 'zero-carbon', largeText: true },
  dark: { scenario: 'zero-carbon', theme: 'dark' },
};
const ROUTES = ['/planner', '/map', '/settings', '/privacy', '/terms', '/glossary', '/history', '/locations', '/changelog',
  '/help', '/feature-guides', '/achievements', '/charging-history', '/onboarding', '/does-not-exist'];

function jobs() {
  const list = [];
  for (const v of VIEWPORTS) {
    for (const [state, cfg] of Object.entries(HOME_STATES)) list.push({ name: `home--${state}--${vpName(v)}`, route: '/', viewport: v, ...cfg, state });
    list.push({ name: `demand--zero-carbon--${vpName(v)}`, route: '/', tab: 'Demand', viewport: v, scenario: 'zero-carbon', fullPage: true });
    for (const r of ROUTES) list.push({ name: `${r.slice(1).replace(/\//g, '-') || 'home'}--default--${vpName(v)}`, route: r, viewport: v, scenario: 'zero-carbon', fullPage: true });
  }
  for (const v of ODD_VIEWPORTS) {
    list.push({ name: `home--zero-carbon--${vpName(v)}`, route: '/', viewport: v, scenario: 'zero-carbon', state: 'zero-carbon' });
    list.push({ name: `demand--zero-carbon--${vpName(v)}`, route: '/', tab: 'Demand', viewport: v, scenario: 'zero-carbon', fullPage: true });
    list.push({ name: `history--default--${vpName(v)}`, route: '/history', viewport: v, scenario: 'zero-carbon', fullPage: true });
  }
  for (const extra of [{ theme: 'dark', tag: 'dark' }, { largeText: true, tag: 'large-text' }]) {
    const v = { width: 390, height: 844 };
    list.push({ name: `demand--${extra.tag}--${vpName(v)}`, route: '/', tab: 'Demand', viewport: v, scenario: 'zero-carbon', fullPage: true, ...extra });
    list.push({ name: `history--${extra.tag}--${vpName(v)}`, route: '/history', viewport: v, scenario: 'zero-carbon', fullPage: true, ...extra });
  }
  return ONLY ? list.filter((j) => j.name.includes(ONLY)) : list;
}

async function run(browser, job) {
  const context = await browser.newContext({ viewport: job.viewport, serviceWorkers: 'block', reducedMotion: 'reduce', colorScheme: job.theme === 'dark' ? 'dark' : 'light' });
  await installMocks(context, SCENARIOS[job.scenario]);
  await context.addInitScript(seedStorage({ postcode: job.postcode ?? 'EH1 1YZ', theme: job.theme ?? 'light' }));
  if (job.offline) await context.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'onLine', { get: () => false }); });
  if (job.largeText) await context.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '200%'; }); });
  const page = await context.newPage();
  const findings = [];
  try {
    await page.goto(BASE + job.route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(job.scenario === 'loading' ? 2500 : 4500);
    if (job.tab) {
      await page.getByRole('tab', { name: new RegExp(job.tab, 'i') }).first().click({ timeout: 5000 }).catch(() => findings.push(`[${job.name}] ${job.tab} tab not found`));
      await page.waitForTimeout(2500);
    }
    const overflow = await page.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
    if (overflow > 1) findings.push(`[${job.name}] horizontal overflow: page is ${overflow}px wider than the viewport`);
    if (job.route === '/' && !job.tab && ['zero-carbon', 'stale', 'long-region', 'long-postcode', 'large-text', 'dark', 'very-high'].includes(job.state)) {
      const expectBadge = ['zero-carbon', 'long-region', 'long-postcode', 'large-text', 'dark'].includes(job.state) ? true : job.state === 'stale' ? false : undefined;
      findings.push(...(await checkHero(page, { scenario: job.state, expectBadge, region: SCENARIOS[job.scenario].regionName ?? 'South Scotland', viewport: job.viewport })));
      findings.push(...(await checkSheetEdge(page, { viewport: job.viewport })));
    }
    await page.screenshot({ path: path.join(OUT, `${job.name}.png`), fullPage: Boolean(job.fullPage) });
    if (job.fullPage) findings.push(...(await checkScrollSpace(page, { route: job.tab ? `${job.route} (${job.tab})` : job.route, viewport: job.viewport })));
  } catch (e) {
    findings.push(`[${job.name}] error: ${e.message.split('\n')[0]}`);
  } finally {
    await context.close();
  }
  return findings;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const queue = jobs();
  const all = [];
  let done = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const job = queue.shift();
      all.push(...(await run(browser, job)));
      if (++done % 20 === 0) console.log(`${done} screenshots…`);
    }
  }));
  await browser.close();
  all.sort();
  fs.writeFileSync(path.join(OUT, 'findings.json'), JSON.stringify(all, null, 2));
  fs.writeFileSync(path.join(OUT, 'findings.md'), `# Layout sweep findings (${BASE})\n\n${all.length ? all.map((f) => `- ${f}`).join('\n') : 'None.'}\n`);
  console.log(`${done} screenshots in ${OUT}; ${all.length} automated findings.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
