import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  NATIVE_PKCE_VERIFIER_KEY,
  NATIVE_REDIRECT_URI,
  NATIVE_STATE_KEY,
  completeNativeCallback,
  parseNativeAuthCallback,
  sha256Hex,
  type NativeStorage,
  signInWithAppleNative,
  startNativeBrowserSignIn,
  type NativeAuthDeps,
} from './nativeAuth';

const NOW = 1_700_000_000_000;
const STATE = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const CALLBACK = `${NATIVE_REDIRECT_URI}&state=${STATE}&code=CODE`;
const VALID_INTENT = JSON.stringify({ state: STATE, startedAt: NOW });

function memStorage(init: Record<string, string> = {}) {
  const map = new Map(Object.entries(init));
  return {
    getItem: vi.fn((key: string) => map.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void map.set(key, value)),
    removeItem: vi.fn((key: string) => void map.delete(key)),
    map,
  };
}

function savedValue(storage: NativeStorage | undefined, key: string): string | undefined {
  return (storage as ReturnType<typeof memStorage> | undefined)?.map.get(key);
}

function makeDeps(overrides: Partial<NativeAuthDeps> = {}) {
  const d: NativeAuthDeps = {
    auth: {
      signInWithIdToken: vi.fn(async () => ({ error: null })),
      signInWithOAuth: vi.fn(async (c) => ({
        data: {
          url: `https://klwezcjmlrdwvvzisdtd.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(c.options.redirectTo)}&code_challenge=hash&code_challenge_method=s256&state=${c.options.queryParams.state}`,
        },
        error: null,
      })),
      exchangeCodeForSession: vi.fn(async () => ({ error: null })),
    },
    storage: memStorage(),
    now: () => NOW,
    openBrowser: vi.fn(async () => {}),
    closeBrowser: vi.fn(async () => {}),
  };
  return Object.assign(d, overrides);
}

function validStorage() {
  return memStorage({ [NATIVE_STATE_KEY]: VALID_INTENT, [NATIVE_PKCE_VERIFIER_KEY]: 'verifier' });
}

describe('native browser start', () => {
  it('requires Supabase PKCE, saved state and the exact HTTPS redirect before opening', async () => {
    const d = makeDeps();
    const opened = vi.spyOn(d, 'openBrowser');
    await expect(startNativeBrowserSignIn('google', d)).resolves.toEqual({
      error: null,
      redirected: true,
    });
    const authCall = vi.mocked(d.auth.signInWithOAuth).mock.calls[0][0];
    const savedIntent = JSON.parse(savedValue(d.storage, NATIVE_STATE_KEY)!);
    expect(savedIntent).toEqual({ state: expect.stringMatching(/^[a-f0-9]{64}$/), startedAt: NOW });
    expect(authCall).toEqual({
      provider: 'google',
      options: {
        redirectTo: NATIVE_REDIRECT_URI,
        skipBrowserRedirect: true,
        queryParams: { state: savedIntent.state },
      },
    });
    const url = new URL(opened.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe(
      'https://klwezcjmlrdwvvzisdtd.supabase.co/auth/v1/authorize',
    );
    expect(url.searchParams.get('code_challenge')).toBe('hash');
    expect(url.searchParams.get('code_challenge_method')).toBe('s256');
    expect(url.searchParams.get('state')).toBe(savedIntent.state);
  });

  it.each([null, 'https://evil.example/auth/v1/authorize', `${NATIVE_REDIRECT_URI}&state=x`])(
    'never opens an invalid authorization URL: %s',
    async (url) => {
      const d = makeDeps();
      vi.mocked(d.auth.signInWithOAuth).mockResolvedValue({ data: { url }, error: null });
      expect((await startNativeBrowserSignIn('google', d)).redirected).toBe(false);
      expect(d.openBrowser).not.toHaveBeenCalled();
      expect(savedValue(d.storage, NATIVE_STATE_KEY)).toBeUndefined();
    },
  );
});

describe('native callback validation', () => {
  it('only accepts a code on the exact HTTPS callback with matching saved state', () => {
    expect(parseNativeAuthCallback(CALLBACK, STATE)).toEqual({ kind: 'code', code: 'CODE' });
    expect(parseNativeAuthCallback(CALLBACK, null).kind).toBe('error');
    expect(parseNativeAuthCallback(CALLBACK, 'other').kind).toBe('error');
    expect(
      parseNativeAuthCallback(`https://evil.example/auth/callback?state=${STATE}&code=CODE`, STATE)
        .kind,
    ).toBe('not-auth');
  });

  it.each(['GridSense', 'gridsense'])(
    'drops %s auth token handoffs even in a pending sign-in',
    async (scheme) => {
      const storage = validStorage();
      const d = makeDeps({ storage });
      expect(
        await completeNativeCallback(
          `${scheme}://auth/callback?app=ios#access_token=A&refresh_token=R`,
          d,
        ),
      ).toBe('not-auth');
      expect(d.auth.exchangeCodeForSession).not.toHaveBeenCalled();
      expect(savedValue(d.storage, NATIVE_STATE_KEY)).toBe(VALID_INTENT);
    },
  );

  it('exchanges once with matching state and a saved PKCE verifier, closing the browser', async () => {
    const d = makeDeps({ storage: validStorage() });
    expect(await completeNativeCallback(CALLBACK, d)).toBe('signed-in');
    expect(d.auth.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith('CODE');
    expect(d.closeBrowser).toHaveBeenCalled();
    expect(savedValue(d.storage, NATIVE_STATE_KEY)).toBeUndefined();
    expect(d.auth.exchangeCodeForSession).toHaveBeenCalledOnce();
  });

  it.each([
    ['missing state', { [NATIVE_PKCE_VERIFIER_KEY]: 'verifier' }],
    [
      'mismatched state',
      {
        [NATIVE_STATE_KEY]: VALID_INTENT.replace(
          STATE,
          'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        ),
        [NATIVE_PKCE_VERIFIER_KEY]: 'verifier',
      },
    ],
    ['missing PKCE verifier', { [NATIVE_STATE_KEY]: VALID_INTENT }],
    [
      'expired state',
      {
        [NATIVE_STATE_KEY]: JSON.stringify({ state: STATE, startedAt: NOW - 600_001 }),
        [NATIVE_PKCE_VERIFIER_KEY]: 'verifier',
      },
    ],
    [
      'future state',
      {
        [NATIVE_STATE_KEY]: JSON.stringify({ state: STATE, startedAt: NOW + 1 }),
        [NATIVE_PKCE_VERIFIER_KEY]: 'verifier',
      },
    ],
    ['malformed state', { [NATIVE_STATE_KEY]: 'not-json', [NATIVE_PKCE_VERIFIER_KEY]: 'verifier' }],
  ])('refuses code exchange with %s', async (_name, entries) => {
    const d = makeDeps({ storage: memStorage(entries) });
    expect(await completeNativeCallback(CALLBACK, d)).toBe('failed');
    expect(d.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('refuses implicit tokens on the HTTPS return', async () => {
    const d = makeDeps({ storage: validStorage() });
    expect(
      await completeNativeCallback(
        `${NATIVE_REDIRECT_URI}&state=${STATE}#access_token=A&refresh_token=R`,
        d,
      ),
    ).toBe('failed');
    expect(
      await completeNativeCallback(
        `${NATIVE_REDIRECT_URI}&state=${STATE}&access_token=A&refresh_token=R`,
        d,
      ),
    ).toBe('failed');
    expect(d.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('handles an already closed browser and a rejected exchange', async () => {
    const d = makeDeps({
      storage: validStorage(),
      closeBrowser: vi.fn().mockRejectedValue(new Error('closed')),
    });
    vi.mocked(d.auth.exchangeCodeForSession).mockResolvedValue({ error: { message: 'bad_code' } });
    expect(await completeNativeCallback(CALLBACK, d)).toBe('failed');
    expect(d.auth.exchangeCodeForSession).toHaveBeenCalledOnce();
  });
});

describe('native Apple and iOS association', () => {
  it('preserves the hashed Apple nonce and exchanges its identity token', async () => {
    let hashed = '';
    const d = makeDeps({
      appleAuthorize: vi.fn(async (options) => {
        hashed = options.nonce!;
        expect(options.clientId).toBe('com.greengrid.companion');
        return { response: { identityToken: 'id-token' } };
      }),
    });
    expect(await signInWithAppleNative(d)).toEqual({ error: null });
    const authCall = vi.mocked(d.auth.signInWithIdToken).mock.calls[0][0];
    expect(authCall).toEqual({ provider: 'apple', token: 'id-token', nonce: expect.any(String) });
    expect(await sha256Hex(authCall.nonce!)).toBe(hashed);
  });

  it('keeps both live AASA auth callback paths and webcredentials', () => {
    const aasa = JSON.parse(readFileSync('public/.well-known/apple-app-site-association', 'utf8'));
    expect(aasa.applinks.details[0].appIDs).toEqual(['UW7848QP79.com.greengrid.companion']);
    expect(aasa.applinks.details[0].components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ '/': '/auth/callback', '?': { app: 'ios' } }),
        expect.objectContaining({ '/': '/auth/callback' }),
      ]),
    );
    expect(aasa.webcredentials.apps).toEqual(['UW7848QP79.com.greengrid.companion']);
  });

  it('keeps one associated-domain entitlement containing both applinks and webcredentials', () => {
    const entitlements = readFileSync('ios/App/App/App.entitlements', 'utf8');
    expect(
      entitlements.match(/<key>com\.apple\.developer\.associated-domains<\/key>/g),
    ).toHaveLength(1);
    expect(entitlements).toContain('<string>applinks:getgridsense.com</string>');
    expect(entitlements).toContain('<string>webcredentials:getgridsense.com</string>');
    expect(entitlements).toContain('<key>com.apple.developer.applesignin</key>');
  });

  it('does not register the obsolete GridSense OAuth token-return URL schemes', () => {
    const infoPlist = readFileSync('ios/App/App/Info.plist', 'utf8');
    const schemes = [
      ...infoPlist.matchAll(/<key>CFBundleURLSchemes<\/key>\s*<array>([\s\S]*?)<\/array>/g),
    ].flatMap((match) =>
      [...match[1].matchAll(/<string>(.*?)<\/string>/g)].map((value) => value[1]),
    );
    expect(schemes).not.toContain('GridSense');
    expect(schemes).not.toContain('gridsense');
  });
});
