import type { BrowserContext, Page, Route } from '@playwright/test';
import { installMocks } from '../scripts/layout/mock-api.mjs';

// PR-O1 Octopus linking: every request is mocked. Octopus is never called and
// no real key is used; the edge function is answered by `body.action`.
export const FAKE_KEY = 'sk_live_' + 'TESTONLYnotarealkey0000';
export const STORAGE_KEY = 'sb-klwezcjmlrdwvvzisdtd-auth-token';

export const ERR_401 = 'Invalid API key. Please check your Octopus Energy API key.';
export const ERR_404 =
  'Account not found. Please check your account number is correct (e.g. A-12345678).';
export const ERR_500 = 'Octopus API error (500). Please try again later.';

export const IMPORT_METER = {
  mpan: '1900001234567',
  serial_number: 'TEST-S1',
  meter_type: 'import',
};
export const EXPORT_METER = {
  mpan: '1900007654321',
  serial_number: 'TEST-S2',
  meter_type: 'export',
};

type Answer = { status?: number; body: unknown } | 'hold';

export interface OctopusScenario {
  /** get-status answer; defaults to following what the mocked server has stored. */
  status?: () => unknown;
  getMeters: () => Answer;
  seededStorage?: Record<string, unknown>;
  save?: () => Answer;
  fullSync?: () => Answer;
  calls: { action: string; body: Record<string, unknown> }[];
  saved: boolean;
  meters: unknown[];
}

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

/** A fake anonymous session so ensureAuthSession() finds one without a network call. */
function sessionJson() {
  const exp = Math.floor(Date.now() / 1000) + 24 * 3600;
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    is_anonymous: true,
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, exp, role: 'authenticated', is_anonymous: true })}.x`;
  return JSON.stringify({
    access_token: token,
    refresh_token: 'test-refresh',
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: exp,
    user,
  });
}

export const NOT_LINKED_STATUS = {
  is_linked: false,
  has_credentials: false,
  meters: [],
  latest_consumption: null,
  footprint_records: 0,
};

export function scenario(partial: Partial<OctopusScenario> = {}): OctopusScenario {
  return {
    getMeters: () => ({ body: { meters: [IMPORT_METER] } }),
    save: () => ({ body: { success: true } }),
    fullSync: () => 'hold',
    calls: [],
    saved: false,
    meters: [],
    ...partial,
  };
}

export async function setup(
  page: Page,
  context: BrowserContext,
  sc: OctopusScenario,
  { theme = 'light' }: { theme?: 'light' | 'dark' } = {},
) {
  await installMocks(context, { intensity: 120, index: 'moderate' });
  await context.addInitScript(
    (storage: { theme: string; extra?: Record<string, unknown> }) => {
      const { theme } = storage;
      if (sessionStorage.getItem('__seeded')) return;
      sessionStorage.setItem('__seeded', '1');
      const s = {
        onboarding_complete: 'true',
        product_tour_seen: 'true',
        skip_splash: 'true',
        'gridsense-notification-nudge': 'no',
        'cookie-consent': 'declined',
        'cookie-consent-version': '2',
        'gridgreen-postcode': 'EH1 1YZ',
        'vite-ui-theme': theme,
      };
      const fixtureStorage = { ...s, ...storage.extra };
      for (const [k, v] of Object.entries(fixtureStorage)) {
        localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    },
    { theme, extra: sc.seededStorage },
  );
  await context.addInitScript(
    ([k, v]) => {
      if (!localStorage.getItem(k)) localStorage.setItem(k, v);
    },
    [STORAGE_KEY, sessionJson()],
  );
  // Registered after installMocks, so this wins over its catch-all.
  await context.route(/supabase\.co\/functions\/v1\/octopus-energy/, async (route: Route) => {
    const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    const action = String(body.action);
    sc.calls.push({ action, body });
    let a: Answer;
    switch (action) {
      case 'get-status':
        a = {
          body: sc.status
            ? sc.status()
            : {
                ...NOT_LINKED_STATUS,
                has_credentials: sc.saved,
                is_linked: sc.meters.length > 0,
                meters: sc.meters,
              },
        };
        break;
      case 'save-credentials':
        a = sc.save!();
        if (a !== 'hold' && (a.status ?? 200) < 400) sc.saved = true;
        break;
      case 'get-meters':
        a = sc.getMeters();
        if (a !== 'hold') {
          const m = (a.body as { meters?: unknown[] }).meters ?? [];
          if (m.length) sc.meters = m;
        }
        break;
      case 'full-sync':
        a = sc.fullSync!();
        break;
      case 'get-footprint':
        a = { body: { footprints: [] } };
        break;
      default:
        a = { body: {} };
    }
    if (a === 'hold') return; // never answered: keeps the loading state on screen
    await route.fulfill({
      status: a.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(a.body),
    });
  });
  await context.route(/octopus\.energy/, (route) => route.abort());
}

export async function openSettings(page: Page) {
  await page.goto('/settings');
  const card = page.getByTestId('octopus-entry-card');
  await card.waitFor({ timeout: 60_000 });
  return card;
}

export async function openSheet(page: Page) {
  const card = await openSettings(page);
  await card.getByRole('button', { name: 'Link my Octopus account' }).click();
  const sheet = page.getByTestId('octopus-link-sheet');
  await sheet.waitFor();
  // Let the sheet finish sliding in.
  await page.waitForTimeout(700);
  return sheet;
}
