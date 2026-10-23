import { test, expect, type Page } from '@playwright/test';
import {
  ERR_401,
  ERR_404,
  FAKE_KEY,
  IMPORT_METER,
  openSettings,
  openSheet,
  scenario,
  setup,
} from './octopus-link.helpers';
import {
  OCTOPUS_API_PAGE_URL,
  OCTOPUS_DASHBOARD_URL,
  OCTOPUS_FIELD_ERRORS,
  OCTOPUS_REFERRAL_URL,
  OCTOPUS_SUCCESS_COPY,
} from '../src/lib/voice/octopusLinkCopy';

// PR-O1 Octopus linking flow. Every request is mocked (see helpers): Octopus
// is never called and no real key is used.
test.use({ serviceWorkers: 'block' });
test.setTimeout(90_000);

const toasts = (page: Page) => page.locator('[data-sonner-toast]');

async function fillValid(page: Page) {
  await page.locator('#account-number').fill('A-12AB34CD');
  await page.locator('#api-key').fill(FAKE_KEY);
}

test('deep links, paste + normalising, format errors, wrong key on the key field, no toast', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const sc = scenario({ getMeters: () => ({ body: { error: ERR_401, meters: [] } }) });
  await setup(page, context, sc);

  const card = await openSettings(page);
  const cardReferral = card.getByRole('link', { name: 'Join through our referral link.' });
  await expect(cardReferral).toHaveAttribute('href', OCTOPUS_REFERRAL_URL);
  await expect(cardReferral).toHaveAttribute('target', '_blank');

  await card.getByRole('button', { name: 'Link my Octopus account' }).click();
  const sheet = page.getByTestId('octopus-link-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('link', { name: /Open Octopus API page/ })).toHaveAttribute(
    'href',
    OCTOPUS_API_PAGE_URL,
  );
  await expect(sheet.getByRole('link', { name: /Open Octopus dashboard/ })).toHaveAttribute(
    'href',
    OCTOPUS_DASHBOARD_URL,
  );
  await expect(
    sheet.getByRole('link', { name: 'Join through our referral link.' }),
  ).toHaveAttribute('href', OCTOPUS_REFERRAL_URL);

  const submit = page.getByTestId('octopus-link-submit');
  await expect(submit).toBeDisabled();

  // Paste normalises: spaces trimmed, uppercased, the dash added.
  await page.evaluate(() => navigator.clipboard.writeText('  a12ab34cd '));
  await sheet.getByRole('button', { name: 'Paste account number' }).click();
  await expect(page.locator('#account-number')).toHaveValue('A-12AB34CD');

  // Format error shows on blur, on the account field only.
  await page.locator('#account-number').fill('A-123');
  await page.locator('#api-key').focus();
  await expect(page.locator('#account-error')).toHaveText(OCTOPUS_FIELD_ERRORS.accountFormat);
  await expect(page.locator('#account-number')).toHaveAttribute('aria-invalid', 'true');
  await expect(submit).toBeDisabled();

  await page.evaluate((k) => navigator.clipboard.writeText(` ${k}\n`), FAKE_KEY);
  await sheet.getByRole('button', { name: 'Paste API key' }).click();
  await expect(page.locator('#api-key')).toHaveValue(FAKE_KEY);
  await page.locator('#account-number').fill('A-12AB34CD');
  await expect(page.locator('#account-error')).toHaveCount(0);
  await expect(submit).toBeEnabled();

  await submit.click();
  await expect(page.locator('#apikey-error')).toHaveText(OCTOPUS_FIELD_ERRORS.wrongKey);
  await expect(page.locator('#api-key')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#account-error')).toHaveCount(0);
  await expect(page.getByTestId('octopus-link-banner')).toHaveCount(0);
  await expect(toasts(page)).toHaveCount(0);

  // Same requests as before PR-O1.
  const sent = sc.calls.filter((c) => c.action !== 'get-status').map((c) => c.body);
  expect(sent).toEqual([
    { action: 'save-credentials', apiKey: FAKE_KEY, accountNumber: 'A-12AB34CD' },
    { action: 'get-meters' },
  ]);
  // The key is never kept on the device.
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(stored).not.toContain(FAKE_KEY);
});

test('wrong account lands on the account field', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(
    page,
    context,
    scenario({ getMeters: () => ({ body: { error: ERR_404, meters: [] } }) }),
  );
  await openSheet(page);
  await fillValid(page);
  await page.getByTestId('octopus-link-submit').click();
  await expect(page.locator('#account-error')).toHaveText(OCTOPUS_FIELD_ERRORS.wrongAccount);
  await expect(page.locator('#apikey-error')).toHaveCount(0);
  await expect(toasts(page)).toHaveCount(0);
});

test('Paste is hidden when the clipboard cannot be read', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, context, scenario());
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });
  const sheet = await openSheet(page);
  await expect(sheet.getByRole('button', { name: 'Paste account number' })).toHaveCount(0);
  await expect(sheet.getByRole('button', { name: 'Paste API key' })).toHaveCount(0);
});

test('success, electricity only: syncing, readings in, then See my footprint', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let release: () => void = () => {};
  const syncDone = new Promise<void>((r) => (release = r));
  const sc = scenario({ getMeters: () => ({ body: { meters: [IMPORT_METER] } }) });
  sc.fullSync = () => 'hold';
  await setup(page, context, sc);
  // Answer full-sync only when the test says so.
  await context.route(/supabase\.co\/functions\/v1\/octopus-energy/, async (route, req) => {
    const body = req.postDataJSON() ?? {};
    if (body.action !== 'full-sync') return route.fallback();
    expect(body).toEqual({ action: 'full-sync', days: 30 });
    await syncDone;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        sync: { success: true, readings_synced: 1440, meters: [{ ok: true }] },
        calculation: { success: true },
      }),
    });
  });
  await openSheet(page);
  await fillValid(page);
  await page.getByTestId('octopus-link-submit').click();
  const sheet = page.getByTestId('octopus-link-sheet');
  await expect(sheet.getByText(OCTOPUS_SUCCESS_COPY.title)).toBeVisible();
  await expect(sheet.getByText(OCTOPUS_SUCCESS_COPY.gasLine)).toBeVisible();
  await expect(page.getByTestId('octopus-first-sync')).toHaveText(OCTOPUS_SUCCESS_COPY.syncing);
  await expect(sheet.getByRole('button', { name: OCTOPUS_SUCCESS_COPY.seeFootprint })).toHaveCount(
    0,
  );
  await expect(toasts(page)).toHaveCount(0);

  release();
  await expect(page.getByTestId('octopus-first-sync')).toHaveText(
    OCTOPUS_SUCCESS_COPY.readingsIn(1440),
  );
  await expect(toasts(page)).toHaveCount(0);
  await sheet.getByRole('button', { name: OCTOPUS_SUCCESS_COPY.seeFootprint }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText(/footprint/i);
});

for (const vp of [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
]) {
  test(`${vp.width}x${vp.height}: no sideways scroll, Link my meter stays on screen`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize(vp);
    await setup(page, context, scenario());
    await openSheet(page);
    const footer = page.getByTestId('octopus-sheet-footer');
    const onScreen = async (h: number) => {
      const box = await footer.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeLessThanOrEqual(h + 1);
      await expect(page.getByTestId('octopus-link-submit')).toBeInViewport({ ratio: 1 });
    };
    await onScreen(vp.height);
    const overflow = await page.evaluate(() => {
      const s = document.querySelector('[data-testid=octopus-link-sheet]')!;
      const wide = [...s.querySelectorAll('*')].filter(
        (el) => el.getBoundingClientRect().right > window.innerWidth + 0.5,
      );
      return {
        doc: document.documentElement.scrollWidth - window.innerWidth,
        wide: wide.map((el) => el.outerHTML.slice(0, 80)),
      };
    });
    expect(overflow.doc).toBeLessThanOrEqual(0);
    expect(overflow.wide).toEqual([]);
    // Keyboard up (Capacitor resizes the body): the footer still shows.
    await page.locator('#account-number').focus();
    await page.setViewportSize({ width: vp.width, height: vp.height - 290 });
    await page.waitForTimeout(400);
    await onScreen(vp.height - 290);
  });
}
