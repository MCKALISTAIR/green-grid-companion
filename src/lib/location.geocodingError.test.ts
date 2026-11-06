import { describe, it, expect, vi, afterEach } from 'vitest';

// Security PR: the geocoding edge function now answers a failure with
// { error: 'Geocoding failed', code: 'geocoding_failed' } (HTTP 500) instead of
// the raw exception text. The client must still fall back to Nominatim.
const { invoke, getSession } = vi.hoisted(() => ({
  invoke: vi.fn(),
  getSession: vi.fn(async () => ({ data: { session: { access_token: 't' } } })),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke }, auth: { getSession } },
}));

import { searchLocation } from './location';

describe('searchLocation when the geocoding function fails', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('falls back to direct Nominatim on a generic error code', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        name: 'FunctionsHttpError',
        message: 'Edge Function returned a non-2xx status code',
      },
    });
    const fetchMock = vi.fn(async (_url: string) => new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchLocation('Nowhere-in-particular-xyz')).toBeNull();
    expect(invoke).toHaveBeenCalledWith('geocoding', expect.anything());
    expect(String(fetchMock.mock.calls[0][0])).toContain('nominatim.openstreetmap.org/search');
  });
});

describe('searchLocation without a session (BH-148)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('skips the proxy (it needs a session) and asks Nominatim directly', async () => {
    invoke.mockClear();
    getSession.mockResolvedValueOnce({ data: { session: null } } as never);
    const fetchMock = vi.fn(async (_url: string) => new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchLocation('Somewhere-else-xyz')).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
    expect(String(fetchMock.mock.calls[0][0])).toContain('nominatim.openstreetmap.org/search');
  });
});
