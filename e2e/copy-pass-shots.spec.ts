import { test, type Page } from '@playwright/test';
import { openSheet, scenario, setup } from './octopus-link.helpers';

// PR-C1 copy pass: screenshots for Design review of every screen whose copy
// changed by more than 20% (DESIGN-REVIEW.md, acceptance check 5). Fully mocked.
// Opt-in, so a normal run never rewrites the committed images:
//   PR_SHOTS=1 npx playwright test e2e/copy-pass-shots.spec.ts
test.skip(!process.env.PR_SHOTS, 'set PR_SHOTS=1 to capture docs/pr-shots/pr-c1');
test.use({ serviceWorkers: 'block' });
test.setTimeout(120_000);

const OUT = 'docs/pr-shots/pr-c1';
const PHONES = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
  await page.mouse.move(1, 1);
}

async function shot(page: Page, name: string, fullPage = false) {
  const { width, height } = page.viewportSize()!;
  await page.screenshot({ path: `${OUT}/${name}-${width}x${height}.png`, fullPage });
}

interface Cell {
  slug: string;
  path: string;
  full?: boolean;
  /** Runs after navigation, before the screenshot. */
  prep?: (page: Page) => Promise<void>;
  /** Skip the signed-in Octopus mocks (first launch). */
  firstLaunch?: boolean;
}

const tab = (name: string) => async (page: Page) => {
  await page.getByRole('tab', { name }).click();
  await page.waitForTimeout(1500);
};

const CELLS: Cell[] = [
  { slug: 'home', path: '/' },
  {
    slug: 'home-forecast-weather',
    path: '/',
    prep: async (page) => {
      // ForecastSummary sits inside the collapsed 'More insights' section.
      await page.getByRole('button', { name: 'More insights' }).click();
      await page
        .getByTestId('forecast-day-card')
        .first()
        .evaluate((el) => el.scrollIntoView({ block: 'center' }));
    },
  },
  { slug: 'home-demand', path: '/', prep: tab('Demand') },
  { slug: 'home-footprint-not-linked', path: '/', prep: tab('Footprint') },
  {
    slug: 'location-search-sheet',
    path: '/locations',
    prep: async (page) => {
      const add = page.getByRole('button', { name: /add|search/i }).first();
      if (await add.isVisible().catch(() => false)) await add.click();
      await page.waitForTimeout(700);
    },
  },
  { slug: 'rank', path: '/map' },
  { slug: 'settings', path: '/settings', full: true },
  { slug: 'manage-locations-empty', path: '/locations' },
  { slug: 'history', path: '/history' },
  { slug: 'changelog', path: '/changelog', full: true },
  { slug: 'charging-history', path: '/charging-history' },
  { slug: 'not-found', path: '/this-page-does-not-exist' },
  { slug: 'feature-guides', path: '/feature-guides', full: true },
  { slug: 'help', path: '/help', full: true },
  { slug: 'onboarding', path: '/onboarding', firstLaunch: true },
];

for (const vp of PHONES) {
  for (const cell of CELLS) {
    test(`${cell.slug} ${vp.width}x${vp.height}`, async ({ page, context }) => {
      await page.setViewportSize(vp);
      if (cell.firstLaunch) {
        await setup(page, context, scenario());
        await context.addInitScript(() => {
          if (sessionStorage.getItem('__fl')) return;
          sessionStorage.setItem('__fl', '1');
          localStorage.removeItem('onboarding_complete');
        });
      } else {
        await setup(page, context, scenario());
      }
      await page.goto(cell.path);
      await settle(page);
      if (cell.prep) await cell.prep(page);
      await settle(page);
      await shot(page, cell.slug, cell.full);
    });
  }

  test(`octopus link sheet ${vp.width}x${vp.height}`, async ({ page, context }) => {
    await page.setViewportSize(vp);
    await setup(page, context, scenario());
    const card = page.getByTestId('octopus-entry-card');
    await page.goto('/settings');
    await card.waitFor({ timeout: 60_000 });
    await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await settle(page);
    await shot(page, 'octopus-entry-card');
    await openSheet(page);
    await settle(page);
    await shot(page, 'octopus-link-sheet');
  });
}

// Nav check (acceptance 6): the side nav and Rank header at desktop width.
for (const path of ['/', '/map']) {
  test(`desktop nav ${path}`, async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setup(page, context, scenario());
    await page.goto(path);
    await settle(page);
    await shot(page, path === '/' ? 'desktop-nav-home' : 'desktop-nav-rank');
  });
}
