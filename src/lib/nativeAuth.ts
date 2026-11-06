/** Native iOS sign-in. Google uses HTTPS, state and Supabase PKCE. Apple is native. */
import { SUPABASE_AUTH_STORAGE_KEY, SUPABASE_URL_ORIGIN } from '@/integrations/supabase/client';

export const NATIVE_AUTH_ORIGIN = 'https://getgridsense.com';
export const NATIVE_REDIRECT_URI = `${NATIVE_AUTH_ORIGIN}/auth/callback?app=ios`;
export const NATIVE_STATE_KEY = 'gridsense-native-oauth-state';
export const NATIVE_PKCE_VERIFIER_KEY = `${SUPABASE_AUTH_STORAGE_KEY}-code-verifier`;
export const NATIVE_STATE_TTL_MS = 10 * 60 * 1000;

export interface NativeStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): unknown;
  removeItem(key: string): unknown;
}

export type NativeCallbackResult =
  { kind: 'not-auth' } | { kind: 'error'; message: string } | { kind: 'code'; code: string };

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** No implicit tokens and no custom URL scheme: only the live HTTPS callback. */
export function parseNativeAuthCallback(
  href: string,
  expectedState: string | null,
): NativeCallbackResult {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { kind: 'not-auth' };
  }
  if (url.origin !== NATIVE_AUTH_ORIGIN || url.pathname.replace(/\/+$/, '') !== '/auth/callback')
    return { kind: 'not-auth' };
  if (!expectedState || url.searchParams.get('state') !== expectedState) {
    return { kind: 'error', message: 'Sign-in could not be verified. Please try again.' };
  }
  if (url.searchParams.has('error')) {
    return { kind: 'error', message: 'Sign in was not completed. Please try again.' };
  }
  const code = url.searchParams.get('code');
  if (!code || url.hash.length > 1 || url.searchParams.has('access_token')) {
    return { kind: 'error', message: 'Sign-in did not return a secure code. Please try again.' };
  }
  return { kind: 'code', code };
}

async function readState(storage: NativeStorage, now: number): Promise<string | null> {
  try {
    const raw = await storage.getItem(NATIVE_STATE_KEY);
    if (!raw) return null;
    const intent = JSON.parse(raw) as { state?: unknown; startedAt?: unknown };
    const age = now - Number(intent.startedAt);
    if (
      typeof intent.state !== 'string' ||
      intent.state.length < 32 ||
      typeof intent.startedAt !== 'number' ||
      age < 0 ||
      age > NATIVE_STATE_TTL_MS
    )
      return null;
    return intent.state;
  } catch {
    return null;
  }
}

export interface NativeAuthDeps {
  auth: {
    signInWithIdToken(c: {
      provider: 'apple';
      token: string;
      nonce?: string;
    }): Promise<{ error: { message: string } | null }>;
    signInWithOAuth(c: {
      provider: 'google';
      options: { redirectTo: string; skipBrowserRedirect: true; queryParams: { state: string } };
    }): Promise<{ data: { url: string | null }; error: { message: string } | null }>;
    exchangeCodeForSession(code: string): Promise<{ error: { message: string } | null }>;
  };
  appleAuthorize?: (o: {
    clientId: string;
    redirectURI: string;
    scopes?: string;
    nonce?: string;
  }) => Promise<{ response: { identityToken?: string | null } }>;
  openBrowser?: (url: string) => Promise<void>;
  closeBrowser?: () => Promise<void>;
  storage?: NativeStorage;
  /** Test seam for one-use intent expiry; production uses the current device time. */
  now?: () => number;
}

export async function signInWithAppleNative(
  deps: NativeAuthDeps,
): Promise<{ error: Error | null }> {
  try {
    const nonce = randomHex(16);
    const authorize =
      deps.appleAuthorize ??
      (async (o) => {
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
        return SignInWithApple.authorize(o);
      });
    const res = await authorize({
      clientId: 'com.greengrid.companion',
      redirectURI: `${NATIVE_AUTH_ORIGIN}/auth/callback`,
      scopes: 'email name',
      nonce: await sha256Hex(nonce),
    });
    const token = res.response.identityToken;
    if (!token) return { error: new Error('Apple did not return an identity token') };
    const { error } = await deps.auth.signInWithIdToken({ provider: 'apple', token, nonce });
    return { error: error ? new Error(error.message) : null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function startNativeBrowserSignIn(
  provider: 'google',
  deps: NativeAuthDeps,
): Promise<{ error: Error | null; redirected: boolean }> {
  const storage = deps.storage ?? localStorage;
  const state = randomHex(32);
  const now = deps.now ?? Date.now;
  try {
    await storage.setItem(NATIVE_STATE_KEY, JSON.stringify({ state, startedAt: now() }));
    const { data, error } = await deps.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: NATIVE_REDIRECT_URI,
        skipBrowserRedirect: true,
        queryParams: { state },
      },
    });
    if (error || !data.url) throw error ?? new Error('No sign-in URL was returned');
    const url = new URL(data.url);
    if (
      url.origin !== SUPABASE_URL_ORIGIN ||
      url.pathname !== '/auth/v1/authorize' ||
      url.searchParams.get('provider') !== provider ||
      !url.searchParams.get('code_challenge') ||
      url.searchParams.get('code_challenge_method') !== 's256' ||
      url.searchParams.get('redirect_to') !== NATIVE_REDIRECT_URI ||
      url.searchParams.get('state') !== state
    )
      throw new Error('The sign-in flow did not start with state and PKCE');
    const open =
      deps.openBrowser ??
      (async (href: string) => {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: href, presentationStyle: 'popover' });
      });
    await open(url.toString());
    return { error: null, redirected: true };
  } catch (e) {
    await storage.removeItem(NATIVE_STATE_KEY);
    return { error: e instanceof Error ? e : new Error(String(e)), redirected: false };
  }
}

export type NativeCallbackOutcome = 'not-auth' | 'signed-in' | 'failed';

export async function completeNativeCallback(
  href: string,
  deps: NativeAuthDeps,
  onError?: (message: string) => void,
): Promise<NativeCallbackOutcome> {
  const storage = deps.storage ?? localStorage;
  const expectedState = await readState(storage, (deps.now ?? Date.now)());
  const result = parseNativeAuthCallback(href, expectedState);
  if (result.kind === 'not-auth') return 'not-auth';
  try {
    await storage.removeItem(NATIVE_STATE_KEY);
  } catch {
    // The comparison has already failed closed; persist cleanup is best effort.
  }
  try {
    const close =
      deps.closeBrowser ??
      (async () => {
        const { Browser } = await import('@capacitor/browser');
        await Browser.close();
      });
    await close();
  } catch {
    /* Universal links can already have closed the system browser. */
  }
  if (result.kind === 'error') {
    onError?.(result.message);
    return 'failed';
  }
  try {
    const verifier = await storage.getItem(NATIVE_PKCE_VERIFIER_KEY);
    if (!verifier) {
      onError?.('This device did not start this sign-in. Please try again.');
      return 'failed';
    }
    const { error } = await deps.auth.exchangeCodeForSession(result.code);
    if (error) {
      onError?.('Sign in failed. Please try again.');
      return 'failed';
    }
    return 'signed-in';
  } catch {
    onError?.('Sign in failed. Please try again.');
    return 'failed';
  }
}

export function nativeSignIn(provider: 'google' | 'apple', deps: NativeAuthDeps) {
  return provider === 'apple'
    ? signInWithAppleNative(deps)
    : startNativeBrowserSignIn('google', deps);
}
