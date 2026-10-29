import { describe, expect, it, vi } from 'vitest';
import {
  NATIVE_REDIRECT_URI,
  NATIVE_STATE_KEY,
  buildNativeBrokerUrl,
  completeNativeCallback,
  nativeHandoffUrl,
  parseNativeAuthCallback,
  sha256Hex,
  signInWithAppleNative,
  startNativeBrowserSignIn,
  type NativeAuthDeps,
} from './nativeAuth';

const TOKENS = 'access_token=AT&refresh_token=RT&expires_in=3600&token_type=bearer';

function memStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}

function deps(over: Partial<NativeAuthDeps> = {}) {
  const base = {
    auth: {
      signInWithIdToken: vi.fn(
        async (_c: { provider: 'apple'; token: string; nonce?: string }) => ({
          error: null as { message: string } | null,
        }),
      ),
      setSession: vi.fn(async (_t: { access_token: string; refresh_token: string }) => ({
        error: null as { message: string } | null,
      })),
    },
    closeBrowser: vi.fn(async () => {}),
    openBrowser: vi.fn(async (_url: string) => {}),
    storage: memStorage(),
  };
  return Object.assign(base, over) as typeof base & NativeAuthDeps;
}

describe('buildNativeBrokerUrl', () => {
  it('uses the domain broker and an allowed https return, never the custom scheme', () => {
    const url = new URL(buildNativeBrokerUrl('google', 'abc'));
    expect(url.origin + url.pathname).toBe('https://getgridsense.com/~oauth/initiate');
    expect(url.searchParams.get('provider')).toBe('google');
    expect(url.searchParams.get('state')).toBe('abc');
    expect(url.searchParams.get('redirect_uri')).toBe(NATIVE_REDIRECT_URI);
    expect(NATIVE_REDIRECT_URI).toBe('https://getgridsense.com/auth/callback?app=ios');
  });
});

describe('parseNativeAuthCallback', () => {
  it('reads tokens from the universal link hash', () => {
    expect(parseNativeAuthCallback(`${NATIVE_REDIRECT_URI}#${TOKENS}&state=s1`, 's1')).toEqual({
      kind: 'tokens',
      tokens: { access_token: 'AT', refresh_token: 'RT' },
    });
  });
  it('reads tokens from the GridSense:// handoff (either case)', () => {
    for (const scheme of ['GridSense', 'gridsense']) {
      expect(parseNativeAuthCallback(`${scheme}://auth/callback?app=ios#${TOKENS}`).kind).toBe(
        'tokens',
      );
    }
  });
  it('reads tokens from the query', () => {
    expect(parseNativeAuthCallback(`GridSense://auth/callback?${TOKENS}`).kind).toBe('tokens');
  });
  it('rejects a state mismatch', () => {
    expect(parseNativeAuthCallback(`${NATIVE_REDIRECT_URI}#${TOKENS}&state=evil`, 's1').kind).toBe(
      'error',
    );
  });
  it('passes the broker error through', () => {
    expect(
      parseNativeAuthCallback(`${NATIVE_REDIRECT_URI}#error=access_denied&error_description=Nope`),
    ).toEqual({ kind: 'error', message: 'Nope' });
  });
  it('errors when the refresh token is missing', () => {
    expect(parseNativeAuthCallback(`${NATIVE_REDIRECT_URI}#access_token=AT`).kind).toBe('error');
  });
  it('ignores links that are not sign-in returns', () => {
    for (const href of [
      'GridSense://settings',
      'https://getgridsense.com/',
      'https://evil.example/auth/callback#access_token=a&refresh_token=b',
      'not a url',
    ]) {
      expect(parseNativeAuthCallback(href).kind).toBe('not-auth');
    }
  });
});

describe('nativeHandoffUrl', () => {
  it('forwards an app=ios return to the custom scheme, keeping hash and query', () => {
    expect(nativeHandoffUrl(`${NATIVE_REDIRECT_URI}#${TOKENS}`)).toBe(
      `GridSense://auth/callback?app=ios#${TOKENS}`,
    );
    expect(nativeHandoffUrl(`${NATIVE_REDIRECT_URI}#error=access_denied`)).toContain('error=');
  });
  it('leaves web sign-in returns and plain pages alone', () => {
    expect(nativeHandoffUrl(`https://getgridsense.com/#${TOKENS}`)).toBeNull();
    expect(nativeHandoffUrl(`https://getgridsense.com/auth/callback#${TOKENS}`)).toBeNull();
    expect(nativeHandoffUrl(NATIVE_REDIRECT_URI)).toBeNull();
  });
});

describe('completeNativeCallback', () => {
  it('stores the session, clears state and closes the browser', async () => {
    const d = deps({ storage: memStorage({ [NATIVE_STATE_KEY]: 's1' }) });
    const out = await completeNativeCallback(`${NATIVE_REDIRECT_URI}#${TOKENS}&state=s1`, d);
    expect(out).toBe('signed-in');
    expect(d.auth.setSession).toHaveBeenCalledWith({ access_token: 'AT', refresh_token: 'RT' });
    expect(d.closeBrowser).toHaveBeenCalled();
    expect(d.storage.getItem(NATIVE_STATE_KEY)).toBeNull();
  });
  it('does not store a session on a state mismatch', async () => {
    const onError = vi.fn();
    const d = deps({ storage: memStorage({ [NATIVE_STATE_KEY]: 's1' }) });
    const out = await completeNativeCallback(
      `${NATIVE_REDIRECT_URI}#${TOKENS}&state=other`,
      d,
      onError,
    );
    expect(out).toBe('failed');
    expect(d.auth.setSession).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });
  it('reports a setSession failure', async () => {
    const d = deps();
    d.auth.setSession.mockResolvedValueOnce({ error: { message: 'bad' } });
    expect(await completeNativeCallback(`GridSense://auth/callback#${TOKENS}`, d)).toBe('failed');
  });
  it('ignores other deep links without closing anything', async () => {
    const d = deps();
    expect(await completeNativeCallback('GridSense://region/scotland', d)).toBe('not-auth');
    expect(d.closeBrowser).not.toHaveBeenCalled();
  });
  it('still signs in when the browser is already closed', async () => {
    const d = deps({ closeBrowser: vi.fn(async () => Promise.reject(new Error('closed'))) });
    expect(await completeNativeCallback(`GridSense://auth/callback#${TOKENS}`, d)).toBe(
      'signed-in',
    );
  });
});

describe('startNativeBrowserSignIn', () => {
  it('saves state and opens the broker in the system browser', async () => {
    const d = deps();
    const res = await startNativeBrowserSignIn('google', d);
    expect(res).toEqual({ error: null, redirected: true });
    const opened = new URL(d.openBrowser.mock.calls[0][0] as string);
    expect(opened.searchParams.get('state')).toBe(d.storage.getItem(NATIVE_STATE_KEY));
  });
});

describe('signInWithAppleNative', () => {
  it('sends Apple the hashed nonce and Supabase the raw one', async () => {
    let sentNonce = '';
    const d = deps({
      appleAuthorize: vi.fn(async (o) => {
        sentNonce = o.nonce ?? '';
        return { response: { identityToken: 'ID_TOKEN' } };
      }),
    });
    expect(await signInWithAppleNative(d)).toEqual({ error: null });
    const call = d.auth.signInWithIdToken.mock.calls[0][0] as { nonce: string; token: string };
    expect(call.token).toBe('ID_TOKEN');
    expect(await sha256Hex(call.nonce)).toBe(sentNonce);
  });
  it('fails cleanly when the user cancels or no token comes back', async () => {
    const cancelled = deps({
      appleAuthorize: vi.fn(async () => Promise.reject(new Error('1001'))),
    });
    expect((await signInWithAppleNative(cancelled)).error).toBeInstanceOf(Error);
    const empty = deps({ appleAuthorize: vi.fn(async () => ({ response: {} })) });
    expect((await signInWithAppleNative(empty)).error?.message).toMatch(/identity token/);
    expect(empty.auth.signInWithIdToken).not.toHaveBeenCalled();
  });
  it('surfaces a Supabase rejection', async () => {
    const d = deps({ appleAuthorize: vi.fn(async () => ({ response: { identityToken: 't' } })) });
    d.auth.signInWithIdToken.mockResolvedValueOnce({ error: { message: 'audience' } });
    expect((await signInWithAppleNative(d)).error?.message).toBe('audience');
  });
});
