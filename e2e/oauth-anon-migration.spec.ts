import { test, expect } from '@playwright/test';
import { installMocks, seedStorage } from '../scripts/layout/mock-api.mjs';

// BH-129: an anonymous user who linked Octopus, then signs in with Google/Apple
// on the web, must have their anonymous data moved to the new account. The
// broker returns to "/", where the Settings-only AccountBackup listener isn't
// mounted, so the SIGNED_IN event was missed and migrate-data never ran.
// Fully mocked: no real accounts, tokens or Octopus calls.
test.use({ serviceWorkers: 'block' });

const ANON_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-0000000000b2';
const EMAIL = 'bh129@example.com';
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');

test('anonymous Octopus data is migrated after a web OAuth return to /', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const now = Math.floor(Date.now() / 1000);
  const access = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
    sub: USER_ID,
    email: EMAIL,
    role: 'authenticated',
    aud: 'authenticated',
    is_anonymous: false,
    iat: now,
    exp: now + 3600,
  })}.sig`;
  const user = {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: EMAIL,
    is_anonymous: false,
    app_metadata: { provider: 'google', providers: ['google'] },
    user_metadata: {},
    identities: [],
    created_at: '2026-10-29T12:00:00Z',
  };
  await installMocks(context, { intensity: 150, index: 'moderate' });
  await context.addInitScript(seedStorage());
  // What handleSignIn stores before leaving for the broker (once only).
  await context.addInitScript((id) => {
    if (!sessionStorage.getItem('bh129-seeded')) {
      sessionStorage.setItem('bh129-seeded', '1');
      localStorage.setItem('octopus-anon-user-id', id);
    }
  }, ANON_ID);
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
  await context.route(/supabase\.co\/auth\/v1\/user/, (r) =>
    r.fulfill({ json: user, headers: cors }),
  );
  await context.route(/supabase\.co\/auth\/v1\/token/, (r) =>
    r.fulfill({
      json: {
        access_token: access,
        refresh_token: 'rt-2',
        expires_in: 3600,
        expires_at: now + 3600,
        token_type: 'bearer',
        user,
      },
      headers: cors,
    }),
  );
  const migrations: unknown[] = [];
  await context.route(/supabase\.co\/functions\/v1\/octopus-energy/, (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    const body = r.request().postDataJSON() as { action?: string };
    if (body?.action === 'migrate-data') migrations.push(body);
    return r.fulfill({
      json: { migrated: { credentials: false, meters: 0, footprint_records: 0 } },
      headers: cors,
    });
  });

  await page.goto(`/#access_token=${access}&refresh_token=rt-1`);
  await expect(page).not.toHaveURL(/access_token/, { timeout: 20000 });
  await page.waitForTimeout(1500);
  // Visiting Settings later must not be what triggers it either way.
  await page.goto('/settings');
  await expect(page.getByText(EMAIL)).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1500);

  expect(migrations).toEqual([{ action: 'migrate-data', previousUserId: ANON_ID }]);
  expect(await page.evaluate(() => localStorage.getItem('octopus-anon-user-id'))).toBeNull();
});
