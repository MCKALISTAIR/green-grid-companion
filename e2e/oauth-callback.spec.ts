import { test, expect, type BrowserContext } from '@playwright/test';
import { installMocks } from '../scripts/layout/mock-api.mjs';

// BH-119: Google/Apple sign-in on the web returns to the app origin with the
// session in the URL hash. In a fresh browser (no postcode, no onboarding
// state) Index redirects to /onboarding before supabase-js reads the hash, so
// the tokens were lost and Settings still showed the sign-in buttons. Fully
// mocked: no real accounts or tokens.
test.use({ serviceWorkers: 'block' });

const STORAGE_KEY = 'sb-klwezcjmlrdwvvzisdtd-auth-token';
const EMAIL = 'bh119@example.com';
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');

function fakeTokens() {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    sub: 'bh119-user',
    email: EMAIL,
    role: 'authenticated',
    aud: 'authenticated',
    is_anonymous: false,
    iat: now,
    exp: now + 3600,
  };
  return { now, access: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.sig` };
}

const USER = {
  id: 'bh119-user',
  aud: 'authenticated',
  role: 'authenticated',
  email: EMAIL,
  is_anonymous: false,
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: {},
  identities: [
    {
      id: 'g-1',
      user_id: 'bh119-user',
      provider: 'google',
      identity_data: { email: EMAIL },
      created_at: '2026-10-23T12:00:00Z',
      updated_at: '2026-10-23T12:00:00Z',
      last_sign_in_at: '2026-10-23T12:00:00Z',
    },
  ],
  created_at: '2026-10-23T12:00:00Z',
};

async function mockAuth(context: BrowserContext, access: string, now: number) {
  await installMocks(context, { intensity: 150, index: 'moderate' });
  await context.route(/supabase\.co\/auth\/v1\/user/, (route) =>
    route.fulfill({ json: USER, headers: { 'access-control-allow-origin': '*' } }),
  );
  await context.route(/supabase\.co\/auth\/v1\/token/, (route) =>
    route.fulfill({
      json: {
        access_token: access,
        refresh_token: 'rt-refreshed',
        expires_in: 3600,
        expires_at: now + 3600,
        token_type: 'bearer',
        user: USER,
      },
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
}

const variants = [
  {
    name: 'broker hash (access + refresh only)',
    hash: (t: string) => `#access_token=${t}&refresh_token=rt-1&state=bh119`,
  },
  {
    name: 'full implicit-grant hash',
    hash: (t: string, now: number) =>
      `#access_token=${t}&expires_at=${now + 3600}&expires_in=3600&refresh_token=rt-1&token_type=bearer&provider_token=pt`,
  },
];

for (const v of variants) {
  test(`fresh browser keeps the Google session from a ${v.name}`, async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { access, now } = fakeTokens();
    await mockAuth(context, access, now);

    // Fresh browser: no postcode, no onboarding flag, no session.
    await page.goto(`/${v.hash(access, now)}`);

    // The no-postcode redirect still happens...
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20000 });
    // ...but the session was stored first, and the tokens left the URL.
    expect(page.url()).not.toContain('access_token');
    const stored = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(stored, 'session stored in localStorage').toBeTruthy();
    expect(JSON.parse(stored!).access_token).toBe(access);

    // Settings shows the signed-in account, not the sign-in buttons.
    await page.goto('/settings');
    await expect(page.getByText(EMAIL)).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
    await page.screenshot({ path: `test-results/bh119-settings-${v.name.split(' ')[0]}-390.png` });
  });
}

test('an OAuth error return is cleaned from the URL and the app still loads', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installMocks(context, { intensity: 150, index: 'moderate' });
  await page.goto('/#error=access_denied&error_description=User+cancelled');
  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20000 });
  expect(page.url()).not.toContain('error');
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBeNull();
});
