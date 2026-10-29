import { test, type Page, type Route } from '@playwright/test';
import { EXPORT_METER, IMPORT_METER, scenario, setup } from './octopus-link.helpers';

// PR-C2a copy and claims: screenshots for Design review of every screen whose
// copy changed. Fully mocked. Opt-in, so a normal run never rewrites the images:
//   PR_SHOTS=1 npx playwright test e2e/c2a-shots.spec.ts
test.skip(!process.env.PR_SHOTS, 'set PR_SHOTS=1 to capture docs/pr-shots/pr-c2a');
test.use({ serviceWorkers: 'block' });
test.setTimeout(180_000);

const OUT = 'docs/pr-shots/pr-c2a';
const PHONES = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];

async function settle(page: Page, ms = 1200) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
  await page.mouse.move(1, 1);
}

async function shot(page: Page, name: string, fullPage = false) {
  const { width, height } = page.viewportSize()!;
  await page.screenshot({ path: `${OUT}/${name}-${width}x${height}.png`, fullPage });
}

/** Opens every closed accordion / collapsible on the page. */
async function expandAll(page: Page) {
  const closed = page.locator('button[aria-expanded="false"]');
  for (let i = 0; i < 40; i++) {
    const n = await closed.count();
    if (!n) break;
    await closed
      .first()
      .click({ timeout: 2000 })
      .catch(() => {});
    await page.waitForTimeout(150);
  }
}

/** A linked import + export meter with a week of footprint data (68% low-carbon). */
function footprintBody() {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const records = [];
  for (let i = 7 * 48; i > 0; i--) {
    const start = new Date(end.getTime() - i * 30 * 60 * 1000);
    const h = start.getHours();
    const idx = h < 6 ? 'very low' : h < 16 ? 'low' : h < 20 ? 'high' : 'moderate';
    const intensity = { 'very low': 40, low: 90, moderate: 150, high: 230 }[idx]!;
    const kwh = h < 6 ? 0.5 : h < 16 ? 0.25 : 0.3;
    records.push({
      id: `r${i}`,
      interval_start: start.toISOString(),
      interval_end: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
      consumption_kwh: kwh,
      intensity_gco2_kwh: intensity,
      carbon_g: kwh * intensity,
      intensity_index: idx,
      mpan: IMPORT_METER.mpan,
    });
  }
  return {
    records,
    export_records: [],
    summary: {
      total_carbon_kg: 11.4,
      total_kwh: 108.6,
      avg_intensity: 105,
      by_intensity_index: {
        'very low': { count: 84, carbon_g: 1680, kwh: 42 },
        low: { count: 140, carbon_g: 2970, kwh: 32 },
        moderate: { count: 56, carbon_g: 2520, kwh: 16.8 },
        high: { count: 56, carbon_g: 4230, kwh: 17.8 },
      },
      period_days: 7,
      export_kwh: 21.3,
      export_carbon_kg: 2.1,
      net_carbon_kg: 9.3,
      has_export_meter: true,
    },
  };
}

async function linkedFootprint(page: Page) {
  const linked = {
    is_linked: true,
    has_credentials: true,
    api_key_hint: '0000',
    meters: [
      { id: 'm1', is_active: true, last_sync_at: new Date().toISOString(), ...IMPORT_METER },
      { id: 'm2', is_active: true, last_sync_at: new Date().toISOString(), ...EXPORT_METER },
    ],
    latest_consumption: new Date().toISOString(),
    footprint_records: 336,
  };
  await setup(page, page.context(), scenario({ status: () => linked }));
  await page.context().addInitScript(() => localStorage.setItem('octopus-is-linked', 'true'));
  // Registered last, so it wins for get-footprint; everything else falls through.
  await page
    .context()
    .route(/supabase\.co\/functions\/v1\/octopus-energy/, async (route: Route) => {
      const body = (route.request().postDataJSON() ?? {}) as { action?: string };
      if (body.action !== 'get-footprint') return route.fallback();
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(footprintBody()),
      });
    });
}

interface Cell {
  slug: string;
  path: string;
  full?: boolean;
  expand?: boolean;
  prep?: (page: Page) => Promise<void>;
}

const CELLS: Cell[] = [
  { slug: 'help', path: '/help', full: true, expand: true },
  { slug: 'privacy-policy', path: '/privacy', full: true },
  { slug: 'glossary', path: '/glossary', full: true, expand: true },
  { slug: 'guide-home-dashboard', path: '/guides/home-dashboard', full: true },
  { slug: 'guide-carbon-intensity', path: '/guides/carbon-intensity', full: true },
  { slug: 'guide-leaderboard', path: '/guides/leaderboard', full: true },
  { slug: 'feature-guides', path: '/feature-guides', full: true },
  { slug: 'changelog', path: '/changelog', full: true },
  { slug: 'settings', path: '/settings', full: true },
];

for (const vp of PHONES) {
  for (const cell of CELLS) {
    test(`${cell.slug} ${vp.width}x${vp.height}`, async ({ page, context }) => {
      await page.setViewportSize(vp);
      await setup(page, context, scenario());
      await page.goto(cell.path);
      await settle(page);
      if (cell.expand) await expandAll(page);
      if (cell.prep) await cell.prep(page);
      await settle(page, 600);
      await shot(page, cell.slug, cell.full);
    });
  }

  test(`account backup line ${vp.width}x${vp.height}`, async ({ page, context }) => {
    await page.setViewportSize(vp);
    await setup(page, context, scenario());
    await page.goto('/settings');
    const line = page.getByText('Your Octopus key is stored encrypted.', { exact: false });
    await line.waitFor({ timeout: 60_000 });
    await line.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await settle(page);
    await shot(page, 'settings-account-backup');
  });

  test(`notifications (digest rows hidden) ${vp.width}x${vp.height}`, async ({ page, context }) => {
    await page.setViewportSize(vp);
    await setup(page, context, scenario());
    await page.goto('/settings');
    const h = page.getByText('Daily Forecast', { exact: false }).first();
    await h.waitFor({ timeout: 60_000 });
    await h.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await settle(page);
    await shot(page, 'settings-notifications');
  });

  test(`year wrapped ${vp.width}x${vp.height}`, async ({ page, context }) => {
    await page.setViewportSize(vp);
    await setup(page, context, scenario());
    await page.goto('/settings');
    const row = page.getByText('Your year on the GB grid');
    await row.waitFor({ timeout: 60_000 });
    await row.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await settle(page);
    await shot(page, 'settings-year-wrapped-row');
    await row.click();
    const next = page.getByRole('button', { name: /next|continue/i }).last();
    await page.getByText(/Your year on the GB grid, from/).waitFor({ timeout: 90_000 });
    await settle(page, 1500);
    await shot(page, 'year-wrapped-intro');
    await next.click();
    await settle(page, 1500);
    await shot(page, 'year-wrapped-slide-2');
    for (let i = 0; i < 3; i++) {
      await next.click().catch(() => {});
      await page.waitForTimeout(900);
    }
    await page.getByText("That's a Wrap!").waitFor({ timeout: 10_000 });
    await settle(page, 1500);
    await shot(page, 'year-wrapped-summary');
  });

  test(`footprint ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await linkedFootprint(page);
    await page.goto('/');
    await settle(page);
    await page.getByRole('tab', { name: 'Footprint' }).click();
    await page.getByText(/of your usage landed in low-carbon periods/).waitFor({ timeout: 60_000 });
    await settle(page, 1500);
    await shot(page, 'footprint', true);
    const miles = page.getByText('Miles Driven');
    await miles.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await miles.click();
    await page.getByText('Source: DESNZ 2025').waitFor();
    await settle(page, 600);
    await shot(page, 'footprint-miles-popover');
    await page.keyboard.press('Escape');
    const exp = page.getByText(/kWh exported/);
    await exp.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const card = exp.locator('xpath=ancestor::div[contains(@class,"relative")][1]');
    await card.locator('button').first().click();
    await page.getByText(/We take that off your net footprint/).waitFor({ timeout: 5000 });
    await settle(page, 600);
    await shot(page, 'footprint-export-popover');
  });

  test(`home regional fallback ${vp.width}x${vp.height}`, async ({ page, context }) => {
    await page.setViewportSize(vp);
    await setup(page, context, scenario());
    await context.route(
      /api\.carbonintensity\.org\.uk\/regional\/(postcode|regionid|intensity)/,
      (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );
    await page.goto('/');
    await page.getByText(/showing the\s+GB average instead/).waitFor({ timeout: 60_000 });
    await settle(page);
    await shot(page, 'home-regional-fallback');
  });
}
