import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// PR-O1: saveCredentials returns a typed result, never toasts, and sends the
// same two requests as before. Supabase and sonner are mocked; no network.
const invoke = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();
let session: unknown = { user: { id: 'u1' } };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
  },
}));
vi.mock('sonner', () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
    info: vi.fn(),
  },
}));
vi.mock('@/lib/auth-utils', () => ({
  ensureAuthSession: async () => session,
  hasValidSession: async () => true,
}));

import { useOctopusEnergy } from './useOctopusEnergy';

const KEY = 'sk_live_' + 'Zq9Xw8Vu7Ts6Rq5Po4Nm';
const ACCOUNT = 'A-12AB34CD';
const ERR_401 = 'Invalid API key. Please check your Octopus Energy API key.';
const ERR_404 = 'Account not found. Please check your account number is correct (e.g. A-12345678).';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

/** A supabase-js FunctionsHttpError look-alike: context is the Response. */
function httpError(status: number, body: unknown) {
  return Object.assign(new Error('Edge Function returned a non-2xx status code'), {
    context: new Response(JSON.stringify(body), { status }),
  });
}

type Answer = { data?: unknown; error?: unknown };
function answers(map: Record<string, () => Answer | Promise<Answer>>) {
  invoke.mockImplementation(async (_fn: string, opts: { body: { action: string } }) => {
    const a = map[opts.body.action];
    const r = a ? await a() : { data: {} };
    return { data: r.data ?? null, error: r.error ?? null };
  });
}

async function save() {
  const { result } = renderHook(() => useOctopusEnergy(), { wrapper });
  let out: Awaited<ReturnType<typeof result.current.saveCredentials>> | undefined;
  await act(async () => {
    out = await result.current.saveCredentials(KEY, ACCOUNT);
  });
  return out!;
}

describe('useOctopusEnergy saveCredentials (PR-O1)', () => {
  beforeEach(() => {
    invoke.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
    localStorage.clear();
    sessionStorage.clear();
    session = { user: { id: 'u1' } };
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it('sends the same two requests with the same bodies, then reports the meters', async () => {
    const meters = [{ mpan: '1900001234567', serial_number: 'S1', meter_type: 'import' }];
    answers({
      'save-credentials': () => ({ data: { success: true } }),
      'get-meters': () => ({ data: { meters } }),
    });
    const r = await save();
    expect(r).toEqual({ ok: true, meters });
    const calls = invoke.mock.calls
      .map((c) => c[1].body)
      .filter((b) => b.action === 'save-credentials' || b.action === 'get-meters');
    expect(calls).toEqual([
      { action: 'save-credentials', apiKey: KEY, accountNumber: ACCOUNT },
      { action: 'get-meters' },
    ]);
    expect(localStorage.getItem('octopus-is-linked')).toBe('true');
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it.each([
    ['wrong key (401)', { error: ERR_401, meters: [] }, 'wrong_key', 'apiKey'],
    ['wrong account (404)', { error: ERR_404, meters: [] }, 'wrong_account', 'accountNumber'],
    [
      'Octopus 403',
      { error: 'Octopus API error (403). Please try again later.', meters: [] },
      'octopus_refused',
      undefined,
    ],
    [
      'Octopus 500',
      { error: 'Octopus API error (500). Please try again later.', meters: [] },
      'octopus_down',
      undefined,
    ],
    [
      'Octopus 429',
      { error: 'Octopus API error (429). Please try again later.', meters: [] },
      'octopus_down',
      undefined,
    ],
    ['no meter', { meters: [] }, 'no_meter', undefined],
  ])('get-meters %s -> typed result, no toast', async (_n, body, reason, field) => {
    answers({
      'save-credentials': () => ({ data: { success: true } }),
      'get-meters': () => ({ data: body }),
    });
    const r = await save();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reason);
    expect(r.field).toBe(field);
    expect(localStorage.getItem('octopus-is-linked')).toBeNull();
    // Details were stored by the server, so the card shows "Not linked yet" after.
    expect(localStorage.getItem('octopus-has-creds')).toBe('true');
    expect(toastError).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('save 429 carries retry_after; get-meters is not called', async () => {
    answers({
      'save-credentials': () => ({
        error: httpError(429, {
          error: "That's a lot of tries. Try again later.",
          retry_after: 900,
        }),
      }),
    });
    const r = await save();
    expect(r).toEqual({ ok: false, reason: 'rate_limited', retryAfter: 900 });
    expect(invoke.mock.calls.some((c) => c[1].body.action === 'get-meters')).toBe(false);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('save 500 -> save_failed', async () => {
    answers({ 'save-credentials': () => ({ error: httpError(500, { error: 'x' }) }) });
    expect((await save()).reason).toBe('save_failed');
  });

  it('no secure session -> no_session, nothing sent', async () => {
    session = null;
    answers({});
    expect((await save()).reason).toBe('no_session');
    expect(invoke.mock.calls.some((c) => c[1].body.action === 'save-credentials')).toBe(false);
  });

  it('offline network failure -> offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    answers({ 'save-credentials': () => Promise.reject(new TypeError('Failed to fetch')) });
    expect((await save()).reason).toBe('offline');
  });

  it('the key never touches localStorage or sessionStorage', async () => {
    const setLocal = vi.spyOn(Storage.prototype, 'setItem');
    answers({
      'save-credentials': () => ({ data: { success: true } }),
      'get-meters': () => ({ data: { meters: [{ mpan: '1900001234567', serial_number: 'S1' }] } }),
    });
    await save();
    for (const [k, v] of setLocal.mock.calls) {
      expect(String(k)).not.toContain(KEY);
      expect(String(v)).not.toContain(KEY);
    }
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i)!;
        expect(store.getItem(k) ?? '').not.toContain(KEY);
      }
    }
  });
});

describe('useOctopusEnergy firstSync (PR-O1)', () => {
  beforeEach(() => {
    invoke.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
    session = { user: { id: 'u1' } };
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  async function first() {
    const { result } = renderHook(() => useOctopusEnergy(), { wrapper });
    let out: Awaited<ReturnType<typeof result.current.firstSync>> | undefined;
    await act(async () => {
      out = await result.current.firstSync();
    });
    return out!;
  }

  it('runs full-sync for 30 days, the same call as Sync Now, without a toast', async () => {
    answers({
      'full-sync': () => ({
        data: {
          success: true,
          sync: { success: true, readings_synced: 1440, meters: [{ ok: true }] },
          calculation: { success: true },
        },
      }),
    });
    expect(await first()).toEqual({ outcome: 'ok', readings: 1440 });
    expect(invoke.mock.calls.find((c) => c[1].body.action === 'full-sync')![1].body).toEqual({
      action: 'full-sync',
      days: 30,
    });
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('0 readings', async () => {
    answers({
      'full-sync': () => ({
        data: {
          success: true,
          sync: { success: true, readings_synced: 0, meters: [{ ok: true }] },
        },
      }),
    });
    expect(await first()).toEqual({ outcome: 'ok', readings: 0 });
  });

  it('credentials failure', async () => {
    answers({
      'full-sync': () => ({
        data: {
          success: false,
          sync: {
            success: false,
            meters: [{ ok: false, error: 'octopus_http_401', http_status: 401 }],
          },
        },
      }),
    });
    expect((await first()).outcome).toBe('credentials');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('http error', async () => {
    answers({ 'full-sync': () => ({ error: httpError(500, { error: 'boom' }) }) });
    expect((await first()).outcome).toBe('failed');
  });
});
