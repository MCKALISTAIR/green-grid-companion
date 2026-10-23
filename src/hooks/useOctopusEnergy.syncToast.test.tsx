import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// BH-91 / #180: which toast fullSync shows. Supabase and sonner are mocked; no network.
const invoke = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

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
  ensureAuthSession: async () => ({ user: { id: 'u1' } }),
  hasValidSession: async () => true,
}));

import { useOctopusEnergy } from './useOctopusEnergy';

const FAILED = "Couldn't get your Octopus usage just now. Try again in a bit.";
const EXPIRED = 'Your Octopus link has expired. Disconnect it in Settings, then link it again.';
const OFFLINE = "You're offline, so we couldn't get your Octopus usage.";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

/** Mock full-sync only; everything else answers an empty 2xx. */
function fullSyncAnswers(answer: () => Promise<unknown>) {
  invoke.mockImplementation(async (_fn: string, opts: { body: { action: string } }) => {
    if (opts.body.action === 'full-sync') return answer();
    return { data: {}, error: null };
  });
}

async function runFullSync() {
  const { result } = renderHook(() => useOctopusEnergy(), { wrapper });
  await act(async () => {
    await result.current.fullSync(30).catch(() => undefined);
  });
}

describe('useOctopusEnergy fullSync toasts', () => {
  beforeEach(() => {
    invoke.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it('offline at failure time → offline line', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    fullSyncAnswers(async () => {
      throw new TypeError('Failed to fetch');
    });
    await runFullSync();
    expect(toastError).toHaveBeenCalledWith(OFFLINE);
  });

  it('timeout while online → general line', async () => {
    fullSyncAnswers(async () => ({ data: null, error: new Error('Request timed out') }));
    await runFullSync();
    expect(toastError).toHaveBeenCalledWith(FAILED);
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('Octopus 401 on a meter → expired line, no action', async () => {
    fullSyncAnswers(async () => ({
      data: {
        success: false,
        sync: {
          success: false,
          meters: [{ ok: false, http_status: 401, error: 'octopus_http_401' }],
        },
        calculation: { success: true, meters: [] },
      },
      error: null,
    }));
    await runFullSync();
    expect(toastError).toHaveBeenCalledWith(EXPIRED);
    expect(toastError.mock.calls[0]).toHaveLength(1); // no options, so no action button
  });

  it('missing key (400 with code) → expired line', async () => {
    const context = new Response(
      JSON.stringify({ error: 'Missing credentials', code: 'credentials_unavailable' }),
      { status: 400 },
    );
    fullSyncAnswers(async () => ({
      data: null,
      error: Object.assign(new Error('Edge Function returned a non-2xx status code'), { context }),
    }));
    await runFullSync();
    expect(toastError).toHaveBeenCalledWith(EXPIRED);
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('server 5xx meter while online → general line', async () => {
    fullSyncAnswers(async () => ({
      data: {
        success: false,
        sync: {
          success: false,
          meters: [{ ok: false, http_status: 503, error: 'octopus_http_503' }],
        },
        calculation: { success: true, meters: [] },
      },
      error: null,
    }));
    await runFullSync();
    expect(toastError).toHaveBeenCalledWith(FAILED);
  });
});
