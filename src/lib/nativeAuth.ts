/**
 * BH-119 (native iOS): sign-in that works inside the Capacitor app.
 *
 * The web flow can't be reused natively: Lovable's broker only accepts https
 * return addresses on the app's own domain, and rejects GridSense://auth/callback.
 *
 * - Apple: the native Sign in with Apple sheet gives an identity token, which we
 *   exchange with supabase.auth.signInWithIdToken. No browser, no broker.
 * - Google: open the broker in the system browser (SFSafariViewController via
 *   @capacitor/browser) with redirect_uri https://getgridsense.com/auth/callback?app=ios.
 *   The return comes back into the app either as a universal link
 *   (applinks:getgridsense.com) or, if iOS loads the page in the browser instead,
 *   that page hands the tokens on to GridSense://auth/callback (nativeHandoffUrl).
 *   Both arrive through App 'appUrlOpen' and are read by parseNativeAuthCallback.
 */

import { APP_SCHEME } from '@/config';

export const NATIVE_AUTH_ORIGIN = 'https://getgridsense.com';
export const NATIVE_AUTH_CALLBACK_PATH = '/auth/callback';
/** Query flag that marks a broker return meant for the iOS app, not the website. */
export const NATIVE_RETURN_FLAG = 'app';
export const NATIVE_RETURN_VALUE = 'ios';
export const NATIVE_STATE_KEY = 'gridsense-native-oauth-state';

export const NATIVE_REDIRECT_URI = `${NATIVE_AUTH_ORIGIN}${NATIVE_AUTH_CALLBACK_PATH}?${NATIVE_RETURN_FLAG}=${NATIVE_RETURN_VALUE}`;

export function randomHex(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Broker URL for a native Google (or Apple-via-web) sign-in in the system browser. */
export function buildNativeBrokerUrl(provider: 'google' | 'apple', state: string): string {
  const params = new URLSearchParams({ provider, redirect_uri: NATIVE_REDIRECT_URI, state });
  return `${NATIVE_AUTH_ORIGIN}/~oauth/initiate?${params.toString()}`;
}

export type NativeCallbackResult =
  | { kind: 'not-auth' }
  | { kind: 'error'; message: string }
  | { kind: 'tokens'; tokens: { access_token: string; refresh_token: string } };

/**
 * Read a URL the app was opened with. Accepts the universal link
 * (https://getgridsense.com/auth/callback...) and the custom scheme
 * (GridSense://auth/callback...). Tokens can be in the hash or query.
 * When `expectedState` is given, a return with a different state is rejected.
 */
export function parseNativeAuthCallback(
  href: string,
  expectedState?: string | null,
): NativeCallbackResult {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { kind: 'not-auth' };
  }
  const isUniversal =
    url.origin === NATIVE_AUTH_ORIGIN && url.pathname.startsWith(NATIVE_AUTH_CALLBACK_PATH);
  // Custom scheme: GridSense://auth/callback parses as host "auth", path "/callback".
  const isScheme =
    url.protocol === `${APP_SCHEME.toLowerCase()}:` &&
    `/${url.host}${url.pathname}`.toLowerCase().startsWith(NATIVE_AUTH_CALLBACK_PATH);
  if (!isUniversal && !isScheme) return { kind: 'not-auth' };

  const hash = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
  const get = (k: string) => hash.get(k) ?? url.searchParams.get(k);

  const error = get('error_description') ?? get('error');
  if (error) return { kind: 'error', message: error };

  const state = get('state');
  if (expectedState && state !== expectedState) {
    return { kind: 'error', message: 'Sign-in state did not match. Please try again.' };
  }
  const access_token = get('access_token');
  const refresh_token = get('refresh_token');
  if (!access_token || !refresh_token) {
    return { kind: 'error', message: 'Sign-in did not return a session. Please try again.' };
  }
  return { kind: 'tokens', tokens: { access_token, refresh_token } };
}

/**
 * Web side of the fallback. When the broker's return for the iOS app opens in the
 * browser (no universal link), forward the whole hash and query to the app's
 * custom scheme so the app, not the browser, gets the session. Null otherwise.
 */
export function nativeHandoffUrl(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (!url.pathname.startsWith(NATIVE_AUTH_CALLBACK_PATH)) return null;
  if (url.searchParams.get(NATIVE_RETURN_FLAG) !== NATIVE_RETURN_VALUE) return null;
  const hasPayload = /(^|[#&?])(access_token|error)=/.test(url.hash + url.search);
  if (!hasPayload) return null;
  return `${APP_SCHEME}://auth/callback${url.search}${url.hash}`;
}

// ---------------------------------------------------------------- runtime

export interface NativeAuthDeps {
  auth: {
    signInWithIdToken(c: {
      provider: 'apple';
      token: string;
      nonce?: string;
    }): Promise<{ error: { message: string } | null }>;
    setSession(t: {
      access_token: string;
      refresh_token: string;
    }): Promise<{ error: { message: string } | null }>;
  };
  appleAuthorize?: (o: {
    clientId: string;
    redirectURI: string;
    scopes?: string;
    nonce?: string;
  }) => Promise<{ response: { identityToken?: string | null } }>;
  openBrowser?: (url: string) => Promise<void>;
  closeBrowser?: () => Promise<void>;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
}

/** Native Sign in with Apple -> Supabase session. */
export async function signInWithAppleNative(
  deps: NativeAuthDeps,
): Promise<{ error: Error | null }> {
  try {
    const rawNonce = randomHex(16);
    const hashedNonce = await sha256Hex(rawNonce);
    const authorize =
      deps.appleAuthorize ??
      (async (o) => {
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
        return SignInWithApple.authorize(o);
      });
    // On iOS the native sheet uses the bundle ID; clientId/redirectURI are web-only.
    const res = await authorize({
      clientId: 'com.greengrid.companion',
      redirectURI: `${NATIVE_AUTH_ORIGIN}${NATIVE_AUTH_CALLBACK_PATH}`,
      scopes: 'email name',
      nonce: hashedNonce,
    });
    const token = res?.response?.identityToken;
    if (!token) return { error: new Error('Apple did not return an identity token') };
    const { error } = await deps.auth.signInWithIdToken({
      provider: 'apple',
      token,
      nonce: rawNonce,
    });
    return { error: error ? new Error(error.message) : null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/** Open the broker in the system browser for Google. The return arrives via appUrlOpen. */
export async function startNativeBrowserSignIn(
  provider: 'google' | 'apple',
  deps: NativeAuthDeps,
): Promise<{ error: Error | null; redirected: boolean }> {
  try {
    const state = randomHex(16);
    (deps.storage ?? localStorage).setItem(NATIVE_STATE_KEY, state);
    const open =
      deps.openBrowser ??
      (async (url: string) => {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url, presentationStyle: 'popover' });
      });
    await open(buildNativeBrokerUrl(provider, state));
    return { error: null, redirected: true };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)), redirected: false };
  }
}

export type NativeCallbackOutcome = 'not-auth' | 'signed-in' | 'failed';

/** Handle an appUrlOpen URL: close the browser, check state, store the session. */
export async function completeNativeCallback(
  href: string,
  deps: NativeAuthDeps,
  onError?: (message: string) => void,
): Promise<NativeCallbackOutcome> {
  const storage = deps.storage ?? localStorage;
  const expected = storage.getItem(NATIVE_STATE_KEY);
  const result = parseNativeAuthCallback(href, expected);
  if (result.kind === 'not-auth') return 'not-auth';
  storage.removeItem(NATIVE_STATE_KEY);
  try {
    const close =
      deps.closeBrowser ??
      (async () => {
        const { Browser } = await import('@capacitor/browser');
        await Browser.close();
      });
    await close();
  } catch {
    // The browser may already be closed (universal link opened the app directly).
  }
  if (result.kind === 'error') {
    onError?.(result.message);
    return 'failed';
  }
  const { error } = await deps.auth.setSession(result.tokens);
  if (error) {
    onError?.('Sign in failed. Please try again.');
    return 'failed';
  }
  return 'signed-in';
}

/** Native sign-in entry point used by Settings: Apple natively, Google in the system browser. */
export function nativeSignIn(
  provider: 'google' | 'apple',
  deps: NativeAuthDeps,
): Promise<{ error: Error | null }> {
  return provider === 'apple'
    ? signInWithAppleNative(deps)
    : startNativeBrowserSignIn(provider, deps);
}
