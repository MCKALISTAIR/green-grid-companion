import { test, type BrowserContext, type Page } from '@playwright/test';
import {
  ERR_401,
  ERR_404,
  ERR_500,
  EXPORT_METER,
  FAKE_KEY,
  IMPORT_METER,
  openSettings,
  openSheet,
  scenario,
  setup,
  type OctopusScenario,
} from './octopus-link.helpers';
import { OCTOPUS_SUCCESS_COPY } from '../src/lib/voice/octopusLinkCopy';

// PR-O1 screenshot cells (brief section 4) for Design review. Fully mocked.
// Opt-in, so a normal run never rewrites the committed images:
//   PR_SHOTS=1 npx playwright test e2e/octopus-link-shots.spec.ts
test.skip(!process.env.PR_SHOTS, 'set PR_SHOTS=1 to capture docs/pr-shots/pr-o1');
test.use({ serviceWorkers: 'block' });
test.setTimeout(90_000);

const OUT = 'docs/pr-shots/pr-o1';
const PHONES = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];
const BIG = [
  { width: 820, height: 1180 },
  { width: 1280, height: 800 },
];

const syncOk = (readings: number) => () => ({
  body: {
    success: true,
    sync: { success: true, readings_synced: readings, meters: [{ ok: true }] },
    calculation: { success: true },
  },
});

async function submitWith(page: Page) {
  await page.locator('#account-number').fill('A-12AB34CD');
  await page.locator('#api-key').fill(FAKE_KEY);
  await page.getByTestId('octopus-link-submit').click();
}

async function center(page: Page, selector: string) {
  await page
    .locator(selector)
    .first()
    .evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
}

interface Cell {
  n: number;
  slug: string;
  sc: () => OctopusScenario;
  big?: boolean;
  run: (page: Page, context: BrowserContext) => Promise<void>;
}

const CELLS: Cell[] = [
  {
    n: 1,
    slug: 'entry-card',
    big: true,
    sc: () => scenario(),
    run: async (page) => {
      const card = await openSettings(page);
      await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    },
  },
  {
    n: 2,
    slug: 'sheet-top-step1',
    big: true,
    sc: () => scenario(),
    run: async (page) => {
      await openSheet(page);
    },
  },
  {
    n: 3,
    slug: 'sheet-scrolled-step2-form-privacy',
    sc: () => scenario(),
    run: async (page) => {
      await openSheet(page);
      await page
        .getByTestId('octopus-step-2')
        .evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(300);
    },
  },
  {
    n: 4,
    slug: 'error-account-format',
    sc: () => scenario(),
    run: async (page) => {
      await openSheet(page);
      await page.locator('#account-number').fill('A-1234');
      await page.locator('#api-key').focus();
      await page.locator('#api-key').blur();
      await center(page, '#account-error');
    },
  },
  {
    n: 5,
    slug: 'error-wrong-key',
    sc: () => scenario({ getMeters: () => ({ body: { error: ERR_401, meters: [] } }) }),
    run: async (page) => {
      await openSheet(page);
      await submitWith(page);
      await page.locator('#apikey-error').waitFor();
      await center(page, '#account-number');
    },
  },
  {
    n: 6,
    slug: 'error-wrong-account',
    big: true,
    sc: () => scenario({ getMeters: () => ({ body: { error: ERR_404, meters: [] } }) }),
    run: async (page) => {
      await openSheet(page);
      await submitWith(page);
      await page.locator('#account-error').waitFor();
      await center(page, '#account-number');
    },
  },
  {
    n: 7,
    slug: 'banner-no-meter',
    sc: () => scenario({ getMeters: () => ({ body: { meters: [] } }) }),
    run: async (page) => {
      await openSheet(page);
      await submitWith(page);
      await page.getByTestId('octopus-link-banner').waitFor();
      await center(page, '[data-testid=octopus-link-banner]');
    },
  },
  {
    n: 8,
    slug: 'banner-octopus-down',
    sc: () => scenario({ getMeters: () => ({ body: { error: ERR_500, meters: [] } }) }),
    run: async (page) => {
      await openSheet(page);
      await submitWith(page);
      await page.getByTestId('octopus-link-banner').waitFor();
      await center(page, '[data-testid=octopus-link-banner]');
    },
  },
  {
    n: 9,
    slug: 'loading-checking',
    sc: () => scenario({ getMeters: () => 'hold' }),
    run: async (page) => {
      await openSheet(page);
      await submitWith(page);
      await page.getByText('Checking with Octopus...').waitFor();
      await center(page, '#api-key');
    },
  },
  {
    n: 10,
    slug: 'success-electricity-only-syncing',
    sc: () =>
      scenario({ getMeters: () => ({ body: { meters: [IMPORT_METER] } }), fullSync: () => 'hold' }),
    run: async (page) => {
      await openSheet(page);
      await submitWith(page);
      await page.getByTestId('octopus-first-sync').waitFor();
    },
  },
  {
    n: 11,
    slug: 'success-import-export-readings-in',
    sc: () =>
      scenario({
        getMeters: () => ({ body: { meters: [IMPORT_METER, EXPORT_METER] } }),
        fullSync: syncOk(1440),
      }),
    run: async (page) => {
      await openSheet(page);
      await submitWith(page);
      await page.getByText('See my footprint').waitFor();
    },
  },
  {
    n: 12,
    slug: 'success-zero-readings',
    sc: () =>
      scenario({ getMeters: () => ({ body: { meters: [IMPORT_METER] } }), fullSync: syncOk(0) }),
    run: async (page) => {
      await openSheet(page);
      await submitWith(page);
      await page
        .getByTestId('octopus-first-sync')
        .getByText(OCTOPUS_SUCCESS_COPY.zeroReadings)
        .waitFor();
    },
  },
  {
    n: 13,
    slug: 'not-linked-yet-card',
    sc: () => scenario({ saved: true }),
    run: async (page) => {
      // Details saved on an earlier visit: the device remembers that too.
      await page.addInitScript(() => localStorage.setItem('octopus-has-creds', 'true'));
      await page.goto('/settings');
      const actions = page.getByTestId('octopus-not-linked-actions');
      await actions.waitFor({ timeout: 60_000 });
      await actions.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    },
  },
  {
    n: 14,
    slug: 'help-linking-octopus',
    sc: () => scenario(),
    run: async (page) => {
      await page.goto('/help');
      const trigger = page.getByRole('button', { name: 'Linking Octopus' });
      await trigger.waitFor({ timeout: 60_000 });
      await trigger.click();
      await page.waitForTimeout(600); // let the item finish opening first
      await trigger.evaluate((el) => {
        el.style.scrollMarginTop = '16px';
        el.scrollIntoView({ block: 'start' });
      });
    },
  },
];

for (const cell of CELLS) {
  for (const theme of ['light', 'dark'] as const) {
    for (const vp of cell.big ? [...PHONES, ...BIG] : PHONES) {
      const name = `${String(cell.n).padStart(2, '0')}-${cell.slug}-${theme}-${vp.width}x${vp.height}`;
      test(name, async ({ page, context }) => {
        await page.setViewportSize(vp);
        await setup(page, context, cell.sc(), { theme });
        await cell.run(page, context);
        await page.mouse.move(1, 1); // no hover state left on a button
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${OUT}/${name}.png`, animations: 'disabled' });
      });
    }
  }
}
