/**
 * BH-119: finish a web OAuth sign-in before the router can move the page.
 *
 * Google and Apple sign-in on the web go through Lovable's OAuth broker
 * (/~oauth/initiate), which sends the browser back to `redirect_uri` (the app's
 * origin) with the session tokens in the URL hash:
 *   https://getgridsense.com/#access_token=...&refresh_token=...
 *
 * supabase-js reads that hash in `initialize()`, but only after it acquires its
 * navigator lock, which waits until the first render's main-thread work is done
 * (about 0.5 s in tests). In a fresh browser there is no postcode, so Index's
 * "no postcode -> /onboarding" effect runs first and its pushState drops the
 * hash. supabase then finds no tokens and no stored session, and the user lands
 * on onboarding signed out.
 *
 * `captureOAuthRedirect()` reads the tokens synchronously at startup, and
 * `completeOAuthRedirect()` stores the session and strips the tokens from the
 * URL before React renders. It also covers a hash with only access_token and
 * refresh_token, which supabase's own URL detection rejects because it wants
 * expires_in and token_type as well.
 */

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface CapturedOAuthRedirect {
  /** Tokens from the URL, when both are present. */
  tokens: OAuthTokens | null;
  /** Provider or broker error, when the URL carries one. */
  error: string | null;
}

/** URL keys that belong to the OAuth return trip and must never stay in the address bar. */
export const OAUTH_URL_KEYS = [
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
  'token_type',
  'provider_token',
  'provider_refresh_token',
  'type',
  'state',
  'error',
  'error_code',
  'error_description',
] as const;

function hashParams(url: URL): URLSearchParams {
  return new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
}

/**
 * Read OAuth return params from a URL. Null if it isn't an OAuth return.
 *
 * BH-145: tokens are only read from the hash (where the broker puts them).
 * Tokens in the query string are never used, but are still reported as a
 * return (with `tokens: null`) so they get stripped from the address bar.
 */
export function captureOAuthRedirect(href: string): CapturedOAuthRedirect | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const hash = hashParams(url);
  const get = (key: string) => hash.get(key) ?? url.searchParams.get(key);

  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  const error = get('error_description') ?? get('error');
  const queryTokens = url.searchParams.has('access_token') || url.searchParams.has('refresh_token');

  if (!accessToken && queryTokens) return { tokens: null, error: 'tokens_in_query' };

  if (!accessToken && !error) return null;
  return {
    tokens:
      accessToken && refreshToken
        ? { access_token: accessToken, refresh_token: refreshToken }
        : null,
    error: error ?? null,
  };
}

/** The same URL with every OAuth return param removed (other hash/query params kept). */
export function stripOAuthParams(href: string): string {
  const url = new URL(href);
  const hash = hashParams(url);
  for (const key of OAUTH_URL_KEYS) {
    hash.delete(key);
    url.searchParams.delete(key);
  }
  const rest = hash.toString();
  url.hash = rest ? `#${rest}` : '';
  return url.toString();
}

/** The slice of the Supabase auth client this module needs (kept small for tests). */
export interface OAuthSessionClient {
  initialize(): Promise<unknown>;
  getSession(): Promise<{ data: { session: { access_token: string } | null } }>;
  setSession(tokens: OAuthTokens): Promise<{ error: { message: string } | null }>;
}

export interface CompleteOAuthDeps {
  auth: OAuthSessionClient;
  location: Pick<Location, 'href'>;
  history: Pick<History, 'replaceState' | 'state'>;
  warn?: (message: string, context?: Record<string, unknown>) => void;
  /** Give up and render anyway after this long (ms). */
  timeoutMs?: number;
  /**
   * BH-145: true once if this device started a sign-in moments ago
   * (see oauthIntent.ts). Tokens are refused when it returns false.
   */
  consumeIntent: () => boolean;
}

export type OAuthOutcome =
  'none' | 'signed-in' | 'already-signed-in' | 'failed' | 'rejected' | 'timeout';

/**
 * Store the session from a captured OAuth return, then remove the tokens from
 * the URL. Never throws, and always cleans the URL, so the app can render.
 */
export async function completeOAuthRedirect(
  captured: CapturedOAuthRedirect | null,
  deps: CompleteOAuthDeps,
): Promise<OAuthOutcome> {
  if (!captured) return 'none';
  const warn = deps.warn ?? (() => {});

  // Checked (and cleared) up front, before any await, so a second crafted
  // link can't reuse a sign-in the user started.
  const intended = deps.consumeIntent();

  const work = async (): Promise<OAuthOutcome> => {
    if (captured.tokens && !intended) {
      warn('Ignored sign-in tokens this device did not ask for');
      return 'rejected';
    }
    if (captured.error && !captured.tokens) {
      warn('OAuth return carried an error', { error: captured.error });
      return 'failed';
    }
    if (!captured.tokens) {
      warn('OAuth return had an access token but no refresh token');
      return 'failed';
    }
    // Let supabase finish its own URL detection first. If it already stored
    // this session (full implicit-grant hash), don't set it twice.
    await deps.auth.initialize();
    const {
      data: { session },
    } = await deps.auth.getSession();
    if (session?.access_token === captured.tokens.access_token) return 'already-signed-in';

    const { error } = await deps.auth.setSession(captured.tokens);
    if (error) {
      warn('Could not store the session from the OAuth return', { message: error.message });
      return 'failed';
    }
    return 'signed-in';
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<OAuthOutcome>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), deps.timeoutMs ?? 10_000);
  });

  let outcome: OAuthOutcome;
  try {
    outcome = await Promise.race([work(), timeout]);
  } catch (e) {
    warn('OAuth return failed', { message: e instanceof Error ? e.message : String(e) });
    outcome = 'failed';
  } finally {
    clearTimeout(timer);
  }
  if (outcome === 'timeout') warn('Timed out storing the session from the OAuth return');

  // Tokens must not stay in the address bar, history or error reports.
  try {
    deps.history.replaceState(deps.history.state, '', stripOAuthParams(deps.location.href));
  } catch {
    // ignore: an unusual URL shouldn't stop the app rendering
  }
  return outcome;
}
