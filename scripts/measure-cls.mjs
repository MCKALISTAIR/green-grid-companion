#!/usr/bin/env node
/**
 * Measure Cumulative Layout Shift + scene/feed geometry across key interactions.
 * Uses mocked APIs (scripts/layout/mock-api.mjs) against a running Vite/preview.
 *
 * Usage: BASE_URL=http://127.0.0.1:5173 node scripts/measure-cls.mjs
 */
import { chromium } from 'playwright';
import { installMocks, seedStorage, SCENARIOS } from './layout/mock-api.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173';
const OUT = process.env.OUT || '/opt/cursor/artifacts/layout-shift-audit.json';

const CLS_INIT = () => {
  window.__clsEntries = [];
  window.__clsScore = 0;
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__clsScore += e.value;
        window.__clsEntries.push({
          value: e.value,
          startTime: e.startTime,
          sources: (e.sources || []).map((s) => ({
            tag: s.node?.nodeName || null,
            cls: s.node?.className?.toString?.()?.slice?.(0, 80) || null,
            prev: s.previousRect
              ? { y: s.previousRect.y, h: s.previousRect.height }
              : null,
            cur: s.currentRect
              ? { y: s.currentRect.y, h: s.currentRect.height }
              : null,
          })),
        });
      }
    });
    po.observe({ type: 'layout-shift', buffered: true });
    window.__clsObserver = po;
  } catch (err) {
    window.__clsError = String(err);
  }
};

async function dismissOverlays(page) {
  // Cookie / consent / onboarding dismissals used across prior QA scripts.
  for (const sel of [
    'button:has-text("Accept")',
    'button:has-text("Got it")',
    'button:has-text("Continue")',
    'button:has-text("Skip")',
    '[data-testid="consent-accept"]',
    '[aria-label="Close"]',
  ]) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 400 }).catch(() => false)) {
      await btn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
    }
  }
}

async function geometry(page) {
  return page.evaluate(() => {
    const scene = document.querySelector('.home-scene');
    const gauge = document.querySelector('.home-scene-gauge');
    const feed = document.querySelector('.home-feed');
    const tabs = document.querySelector('[data-testid="dashboard-view-tabs"], .dashboard-view-tabs, [role="tablist"]');
    const sr = scene?.getBoundingClientRect();
    const gr = gauge?.getBoundingClientRect();
    const fr = feed?.getBoundingClientRect();
    const tr = tabs?.getBoundingClientRect();
    return {
      sceneH: sr ? Math.round(sr.height) : null,
      sceneTop: sr ? Math.round(sr.top) : null,
      gaugeH: gr ? Math.round(gr.height) : null,
      gaugeVisible: gauge ? getComputedStyle(gauge).visibility !== 'hidden' && getComputedStyle(gauge).opacity !== '0' : false,
      gaugeInDom: !!gauge,
      feedTop: fr ? Math.round(fr.top) : null,
      feedH: fr ? Math.round(fr.height) : null,
      tabsTop: tr ? Math.round(tr.top) : null,
      scrollY: Math.round(window.scrollY),
      cls: window.__clsScore ?? null,
      clsError: window.__clsError ?? null,
      entryCount: window.__clsEntries?.length ?? 0,
    };
  });
}

async function resetCls(page) {
  await page.evaluate(() => {
    window.__clsScore = 0;
    window.__clsEntries = [];
  });
}

async function clickTab(page, label) {
  const tab = page.getByRole('tab', { name: new RegExp(label, 'i') }).first();
  if (await tab.count()) {
    await tab.click();
    return;
  }
  // Fallback: button text inside the dashboard tabs row
  const btn = page.locator('button', { hasText: new RegExp(`^${label}$`, 'i') }).first();
  await btn.click();
}

async function waitSettled(page) {
  await page.waitForTimeout(900);
}

async function openHome(browser, viewport) {
  const context = await browser.newContext({
    viewport,
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  });
  await context.addInitScript(CLS_INIT);
  await installMocks(context, SCENARIOS['zero-carbon']);
  await context.addInitScript(seedStorage());
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await dismissOverlays(page);
  await page
    .waitForFunction(
      () => /gCO₂|Very Low|Very High/.test(document.querySelector('.home-scene-gauge')?.textContent || ''),
      null,
      { timeout: 20000 },
    )
    .catch(() => {});
  await page.waitForTimeout(1200);
  await dismissOverlays(page);
  return { context, page };
}

async function measureViewToggle(page) {
  await resetCls(page);
  const intensity = await geometry(page);

  await clickTab(page, 'Demand');
  await waitSettled(page);
  const demand = await geometry(page);
  const afterDemandCls = await page.evaluate(() => ({
    cls: window.__clsScore,
    entries: window.__clsEntries.slice(),
  }));

  await resetCls(page);
  await clickTab(page, 'Intensity');
  await waitSettled(page);
  const back = await geometry(page);
  const afterIntensityCls = await page.evaluate(() => ({
    cls: window.__clsScore,
    entries: window.__clsEntries.slice(),
  }));

  await resetCls(page);
  await clickTab(page, 'Footprint');
  await waitSettled(page);
  const footprint = await geometry(page);
  const afterFootprintCls = await page.evaluate(() => ({
    cls: window.__clsScore,
    entries: window.__clsEntries.slice(),
  }));

  return {
    intensity,
    demand,
    back,
    footprint,
    deltas: {
      sceneH_intensity_to_demand: (demand.sceneH ?? 0) - (intensity.sceneH ?? 0),
      feedTop_intensity_to_demand: (demand.feedTop ?? 0) - (intensity.feedTop ?? 0),
      sceneH_demand_to_intensity: (back.sceneH ?? 0) - (demand.sceneH ?? 0),
      feedTop_demand_to_intensity: (back.feedTop ?? 0) - (demand.feedTop ?? 0),
      feedTop_intensity_to_footprint: (footprint.feedTop ?? 0) - (intensity.sceneH ? intensity.feedTop : 0),
    },
    cls: {
      toDemand: afterDemandCls,
      toIntensity: afterIntensityCls,
      toFootprint: afterFootprintCls,
    },
  };
}

async function measureRouteNav(page) {
  const routes = ['/history', '/map', '/settings', '/'];
  const results = [];
  for (const route of routes) {
    await resetCls(page);
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await page.waitForTimeout(1400);
    const cls = await page.evaluate(() => ({
      cls: window.__clsScore,
      entries: (window.__clsEntries || []).slice(0, 8),
      path: location.pathname,
    }));
    results.push(cls);
  }
  return results;
}

async function measureHistoryToggle(page) {
  await page.goto(BASE + '/history', { waitUntil: 'domcontentloaded' });
  await dismissOverlays(page);
  await page.waitForTimeout(1500);
  await resetCls(page);

  const before = await page.evaluate(() => {
    const chart = document.querySelector('.recharts-responsive-container, [data-testid="history-chart"], canvas, svg.recharts-surface');
    const title = Array.from(document.querySelectorAll('h1,h2,h3')).find((el) => /day|hour|view|history/i.test(el.textContent || ''));
    return {
      chartH: chart ? Math.round(chart.getBoundingClientRect().height) : null,
      chartTop: chart ? Math.round(chart.getBoundingClientRect().top) : null,
      titleTop: title ? Math.round(title.getBoundingClientRect().top) : null,
      title: title?.textContent?.trim()?.slice(0, 40) || null,
    };
  });

  const toggle7 = page.getByRole('button', { name: /7\s*d|7.?day/i }).first();
  const toggle24 = page.getByRole('button', { name: /24\s*h|24.?hour/i }).first();
  if (await toggle7.count()) await toggle7.click();
  await page.waitForTimeout(800);
  const during = await page.evaluate(() => ({
    cls: window.__clsScore,
    entries: (window.__clsEntries || []).slice(0, 6),
    skeletons: document.querySelectorAll('[class*="skeleton"], .animate-pulse').length,
  }));

  if (await toggle24.count()) await toggle24.click();
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => ({
    cls: window.__clsScore,
    entries: (window.__clsEntries || []).slice(0, 6),
  }));

  return { before, during, after };
}

async function main() {
  const browser = await chromium.launch(
    process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  );
  const viewports = [
    { name: 'iphone-se', width: 375, height: 667 },
    { name: 'iphone-14', width: 390, height: 844 },
  ];
  const report = { base: BASE, at: new Date().toISOString(), viewports: {} };

  try {
    for (const vp of viewports) {
      const { context, page } = await openHome(browser, { width: vp.width, height: vp.height });
      const viewToggle = await measureViewToggle(page);
      const history = await measureHistoryToggle(page);
      const routes = await measureRouteNav(page);
      report.viewports[vp.name] = { viewport: vp, viewToggle, history, routes };
      await context.close();
    }
  } finally {
    await browser.close();
  }

  mkdirSync('/opt/cursor/artifacts', { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
