import { describe, expect, it, vi } from 'vitest';
import {
  captureOAuthRedirect,
  completeOAuthRedirect,
  stripOAuthParams,
  type OAuthSessionClient,
} from './oauthRedirect';

const BASE = 'https://getgridsense.com/';

function fakeDeps(
  href: string,
  opts: { stored?: string | null; setError?: string; hang?: boolean } = {},
) {
  let stored = opts.stored ?? null;
  const auth: OAuthSessionClient = {
    initialize: vi.fn(async () => ({ error: null })),
    getSession: vi.fn(async () => ({
      data: { session: stored ? { access_token: stored } : null },
    })),
    setSession: vi.fn(async (t) => {
      if (opts.hang) await new Promise(() => {});
      if (opts.setError) return { error: { message: opts.setError } };
      stored = t.access_token;
      return { error: null };
    }),
  };
  const location = { href };
  const history = {
    state: { idx: 0 },
    replaceState: vi.fn((_s: unknown, _t: string, url?: string | URL | null) => {
      location.href = String(url);
    }),
  };
  const warn = vi.fn();
  return { auth, location, history, warn };
}

describe('captureOAuthRedirect', () => {
  it('ignores ordinary URLs', () => {
    expect(captureOAuthRedirect(BASE)).toBeNull();
    expect(captureOAuthRedirect(`${BASE}settings?tab=account#top`)).toBeNull();
    expect(captureOAuthRedirect('not a url')).toBeNull();
  });

  it('reads the broker hash with only access and refresh tokens', () => {
    expect(captureOAuthRedirect(`${BASE}#access_token=a.b.c&refresh_token=r1&state=s`)).toEqual({
      tokens: { access_token: 'a.b.c', refresh_token: 'r1' },
      error: null,
    });
  });

  it('reads a full Supabase implicit-grant hash', () => {
    const got = captureOAuthRedirect(
      `${BASE}#access_token=a&expires_at=1&expires_in=3600&refresh_token=r&token_type=bearer`,
    );
    expect(got?.tokens).toEqual({ access_token: 'a', refresh_token: 'r' });
  });

  it('reads tokens from the query string too', () => {
    expect(
      captureOAuthRedirect(`${BASE}auth/callback?access_token=a&refresh_token=r`)?.tokens,
    ).toEqual({ access_token: 'a', refresh_token: 'r' });
  });

  it('reports an error return without tokens', () => {
    expect(
      captureOAuthRedirect(`${BASE}#error=access_denied&error_description=User+cancelled`),
    ).toEqual({ tokens: null, error: 'User cancelled' });
  });
});

describe('stripOAuthParams', () => {
  it('removes every token param and keeps the rest', () => {
    expect(
      stripOAuthParams(
        `${BASE}settings?keep=1&access_token=q#access_token=a&refresh_token=r&expires_in=3600&token_type=bearer&state=s&tab=x`,
      ),
    ).toBe(`${BASE}settings?keep=1#tab=x`);
  });

  it('drops the hash entirely when only tokens were in it', () => {
    expect(stripOAuthParams(`${BASE}#access_token=a&refresh_token=r`)).toBe(BASE);
  });
});

describe('completeOAuthRedirect', () => {
  it('does nothing when there is no OAuth return', async () => {
    const d = fakeDeps(BASE);
    expect(await completeOAuthRedirect(null, d)).toBe('none');
    expect(d.auth.initialize).not.toHaveBeenCalled();
    expect(d.history.replaceState).not.toHaveBeenCalled();
  });

  it('stores the session from a minimal broker hash and cleans the URL', async () => {
    const href = `${BASE}#access_token=a&refresh_token=r&state=s`;
    const d = fakeDeps(href);
    expect(await completeOAuthRedirect(captureOAuthRedirect(href), d)).toBe('signed-in');
    expect(d.auth.initialize).toHaveBeenCalledBefore(d.auth.setSession as never);
    expect(d.auth.setSession).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'r' });
    expect(d.location.href).toBe(BASE);
  });

  it("doesn't set the session twice when supabase already stored it", async () => {
    const href = `${BASE}#access_token=a&refresh_token=r&expires_in=3600&token_type=bearer`;
    const d = fakeDeps(href, { stored: 'a' });
    expect(await completeOAuthRedirect(captureOAuthRedirect(href), d)).toBe('already-signed-in');
    expect(d.auth.setSession).not.toHaveBeenCalled();
    expect(d.location.href).toBe(BASE);
  });

  it('replaces a different stored session (e.g. anonymous) with the new one', async () => {
    const href = `${BASE}#access_token=new&refresh_token=r`;
    const d = fakeDeps(href, { stored: 'anon' });
    expect(await completeOAuthRedirect(captureOAuthRedirect(href), d)).toBe('signed-in');
    expect(d.auth.setSession).toHaveBeenCalledOnce();
  });

  it('still cleans the URL when storing the session fails', async () => {
    const href = `${BASE}#access_token=a&refresh_token=r`;
    const d = fakeDeps(href, { setError: 'Invalid Refresh Token' });
    expect(await completeOAuthRedirect(captureOAuthRedirect(href), d)).toBe('failed');
    expect(d.warn).toHaveBeenCalled();
    expect(d.location.href).toBe(BASE);
  });

  it('cleans an error return without touching the session', async () => {
    const href = `${BASE}#error=access_denied&error_description=No`;
    const d = fakeDeps(href);
    expect(await completeOAuthRedirect(captureOAuthRedirect(href), d)).toBe('failed');
    expect(d.auth.setSession).not.toHaveBeenCalled();
    expect(d.location.href).toBe(BASE);
  });

  it('gives up after the timeout so the app still renders', async () => {
    const href = `${BASE}#access_token=a&refresh_token=r`;
    const d = fakeDeps(href, { hang: true });
    expect(await completeOAuthRedirect(captureOAuthRedirect(href), { ...d, timeoutMs: 20 })).toBe(
      'timeout',
    );
    expect(d.location.href).toBe(BASE);
  });
});
