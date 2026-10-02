/**
 * iPhone Duo web-viewport simulation (Playwright).
 * Does NOT replace Xcode Duo Simulator — validates CSS/layout at estimated
 * logical sizes and mid-session fold/unfold (resize) behavior.
 *
 * Usage: npx tsx scripts/simulate-iphone-duo.ts
 * Requires: vite on http://127.0.0.1:8080
 */
import { chromium, type Page } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.DUO_SIM_BASE_URL || 'http://127.0.0.1:8080';
const OUT = process.env.DUO_SIM_OUT || join(process.cwd(), '.artifacts', 'screenshots');

const VIEWPORTS = [
  { id: 'cover', w: 466, h: 678 },
  { id: 'cover-landscape', w: 678, h: 466 },
  { id: 'inner', w: 890, h: 626 },
  { id: 'inner-portrait', w: 626, h: 890 },
  { id: 'split-view', w: 445, h: 626 },
] as const;

type LayoutProbe = {
  url: string;
  flexDirection: string | null;
  sceneHeight: number | null;
  hasHorizontalOverflow: boolean;
  viewModeSelected: string | null;
  bottomNavVisible: boolean;
  shellHeight: number | null;
};

async function seedStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('onboarding_complete', 'true');
    localStorage.setItem('product_tour_seen', 'true');
    localStorage.setItem('cookie-consent', 'accepted');
    localStorage.setItem('gridgreen-postcode', 'EH1');
    localStorage.setItem('gridgreen-scene-preference', 'countryside');
  });
}

async function dismissChrome(page: Page) {
  const accept = page.getByRole('button', { name: /accept/i });
  if (await accept.count()) await accept.first().click({ timeout: 1500 }).catch(() => {});
}

async function probe(page: Page): Promise<LayoutProbe> {
  return page.evaluate(() => {
    const shell = document.querySelector('.home-shell') as HTMLElement | null;
    const scene = document.querySelector('.home-scene') as HTMLElement | null;
    const selected = document.querySelector('[role="tab"][aria-selected="true"]');
    const bottomNav = document.querySelector('#bottom-nav');
    const docEl = document.documentElement;
    return {
      url: location.href,
      flexDirection: shell ? getComputedStyle(shell).flexDirection : null,
      sceneHeight: scene ? scene.getBoundingClientRect().height : null,
      hasHorizontalOverflow: docEl.scrollWidth > docEl.clientWidth + 1,
      viewModeSelected: selected?.textContent?.trim() || null,
      bottomNavVisible: !!bottomNav && getComputedStyle(bottomNav).display !== 'none',
      shellHeight: shell ? shell.getBoundingClientRect().height : null,
    };
  });
}

async function openHome(page: Page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissChrome(page);
  await page.waitForSelector('.home-shell', { timeout: 15000 });
  await page.waitForTimeout(800);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report: Record<string, unknown> = {
    base: BASE,
    startedAt: new Date().toISOString(),
    viewports: {},
    foldUnfold: {},
    continuousDrag: {},
    pass: true,
    failures: [] as string[],
  };
  const failures = report.failures as string[];

  // --- Static matrix ---
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await seedStorage(page);
    await openHome(page);
    const layout = await probe(page);
    const shot = join(OUT, `sim-${vp.id}.png`);
    await page.screenshot({ path: shot, fullPage: false });

    const expectRow = vp.id === 'inner'; // 890×626 side-by-side
    const rowOk = expectRow
      ? layout.flexDirection === 'row'
      : layout.flexDirection === 'column' || layout.flexDirection === 'row'; // cover-landscape may also row if w>=800

    if (layout.hasHorizontalOverflow) {
      failures.push(`${vp.id}: horizontal overflow`);
      report.pass = false;
    }
    if (expectRow && layout.flexDirection !== 'row') {
      failures.push(`${vp.id}: expected side-by-side (row), got ${layout.flexDirection}`);
      report.pass = false;
    }
    if (vp.id === 'cover' && (layout.sceneHeight ?? 999) > vp.h * 0.6) {
      failures.push(`${vp.id}: scene too tall (${layout.sceneHeight} > 60% of ${vp.h})`);
      report.pass = false;
    }
    if (!layout.bottomNavVisible && vp.w < 1024) {
      failures.push(`${vp.id}: bottom nav not visible`);
      report.pass = false;
    }

    (report.viewports as Record<string, unknown>)[vp.id] = { ...vp, layout, shot, rowOk };
    await context.close();
  }

  // --- Fold / unfold mid-session ---
  {
    const context = await browser.newContext({
      viewport: { width: 466, height: 678 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await seedStorage(page);
    await openHome(page);

    // Switch to Demand and scroll the feed
    await page.getByRole('tab', { name: /demand/i }).click();
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const feed = document.querySelector('.home-feed');
      if (feed) feed.scrollTop = 120;
      else window.scrollBy(0, 200);
    });
    await page.waitForTimeout(300);

    const before = await probe(page);
    await page.screenshot({ path: join(OUT, 'sim-fold-before-cover.png'), fullPage: false });

    // Unfold → inner landscape
    await page.setViewportSize({ width: 890, height: 626 });
    await page.waitForTimeout(600);
    const afterUnfold = await probe(page);
    await page.screenshot({ path: join(OUT, 'sim-fold-after-inner.png'), fullPage: false });

    // Fold again → cover
    await page.setViewportSize({ width: 466, height: 678 });
    await page.waitForTimeout(600);
    const afterFold = await probe(page);
    await page.screenshot({ path: join(OUT, 'sim-fold-after-cover.png'), fullPage: false });

    const demandSurvived =
      (before.viewModeSelected || '').toLowerCase().includes('demand') &&
      (afterUnfold.viewModeSelected || '').toLowerCase().includes('demand') &&
      (afterFold.viewModeSelected || '').toLowerCase().includes('demand');

    if (!demandSurvived) {
      failures.push('fold/unfold: Demand tab selection lost');
      report.pass = false;
    }
    if (afterUnfold.flexDirection !== 'row') {
      failures.push(`unfold: expected row layout, got ${afterUnfold.flexDirection}`);
      report.pass = false;
    }
    if (afterUnfold.hasHorizontalOverflow || afterFold.hasHorizontalOverflow) {
      failures.push('fold/unfold: horizontal overflow after resize');
      report.pass = false;
    }

    report.foldUnfold = {
      before,
      afterUnfold,
      afterFold,
      demandSurvived,
      shots: [
        join(OUT, 'sim-fold-before-cover.png'),
        join(OUT, 'sim-fold-after-inner.png'),
        join(OUT, 'sim-fold-after-cover.png'),
      ],
    };
    await context.close();
  }

  // --- Continuous drag 400 → 900 ---
  {
    const context = await browser.newContext({
      viewport: { width: 400, height: 700 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await seedStorage(page);
    await openHome(page);
    await page.getByRole('tab', { name: /footprint/i }).click();
    await page.waitForTimeout(400);

    const samples: LayoutProbe[] = [];
    for (const w of [400, 500, 600, 700, 800, 890, 900]) {
      await page.setViewportSize({ width: w, height: w >= 800 ? 626 : 700 });
      await page.waitForTimeout(200);
      samples.push(await probe(page));
    }

    const footprintOk = samples.every((s) =>
      (s.viewModeSelected || '').toLowerCase().includes('footprint')
    );
    const overflowOk = samples.every((s) => !s.hasHorizontalOverflow);
    if (!footprintOk) {
      failures.push('continuous drag: Footprint tab lost during resize');
      report.pass = false;
    }
    if (!overflowOk) {
      failures.push('continuous drag: horizontal overflow at intermediate width');
      report.pass = false;
    }

    await page.screenshot({ path: join(OUT, 'sim-drag-end-900.png'), fullPage: false });
    report.continuousDrag = { footprintOk, overflowOk, samples };
    await context.close();
  }

  report.finishedAt = new Date().toISOString();
  const reportPath = join(OUT, 'duo-simulation-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pass: report.pass, failures, reportPath }, null, 2));
  await browser.close();
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
