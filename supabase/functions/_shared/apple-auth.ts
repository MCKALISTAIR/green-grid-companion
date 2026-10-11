/**
 * Sign in with Apple token revocation (required by App Store Review Guideline
 * 5.1.1(v) when an app offering Sign in with Apple lets users delete their account).
 *
 * Flow used by delete-account:
 *   1. The app gets a fresh Apple *authorization code* (native Sign in with Apple
 *      prompt, or Apple JS on the web) right before deletion.
 *   2. We exchange it at https://appleid.apple.com/auth/token for a refresh token.
 *   3. We revoke that token at https://appleid.apple.com/auth/revoke, which removes
 *      GridSense from the user's "Sign in with Apple" apps.
 * We never store Apple tokens.
 *
 * Secrets (Supabase Edge Function secrets):
 *   APPLE_TEAM_ID              10-char Team ID (falls back to APNS_TEAM_ID)
 *   APPLE_SIGNIN_KEY_ID        Key ID of a .p8 key with "Sign in with Apple" enabled
 *   APPLE_SIGNIN_PRIVATE_KEY   full .p8 contents (-----BEGIN PRIVATE KEY----- ...)
 *   APPLE_SIGNIN_CLIENT_ID     iOS bundle ID, for codes from the native prompt
 *                              (falls back to APNS_BUNDLE_ID)
 *   APPLE_SIGNIN_WEB_CLIENT_ID Services ID, for codes from Apple JS on the web (optional)
 */

export type AppleClientKind = 'native' | 'web';

export interface AppleSigninConfig {
  teamId: string;
  keyId: string;
  privateKeyPem: string;
  clientIds: Partial<Record<AppleClientKind, string>>;
}

export type AppleRevocationStatus =
  | 'not_apple_user'
  | 'revoked'
  | 'not_configured'
  | 'no_authorization_code'
  | 'failed';

const APPLE_AUDIENCE = 'https://appleid.apple.com';

export function loadAppleSigninConfig(getEnv: (name: string) => string | undefined): AppleSigninConfig | null {
  const teamId = getEnv('APPLE_TEAM_ID') || getEnv('APNS_TEAM_ID');
  const keyId = getEnv('APPLE_SIGNIN_KEY_ID');
  const privateKeyPem = getEnv('APPLE_SIGNIN_PRIVATE_KEY');
  const native = getEnv('APPLE_SIGNIN_CLIENT_ID') || getEnv('APNS_BUNDLE_ID');
  const web = getEnv('APPLE_SIGNIN_WEB_CLIENT_ID');
  if (!teamId || !keyId || !privateKeyPem || (!native && !web)) return null;
  return {
    teamId,
    keyId,
    privateKeyPem: privateKeyPem.replace(/\\n/g, '\n'),
    clientIds: { ...(native ? { native } : {}), ...(web ? { web } : {}) },
  };
}

function base64Url(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToPkcs8(pem: string): Uint8Array<ArrayBuffer> {
  const b64 = pem.replace(/-----BEGIN [A-Z ]+-----|-----END [A-Z ]+-----|\s/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** ES256 client secret JWT for appleid.apple.com (valid 5 minutes). */
export async function createAppleClientSecret(
  config: Pick<AppleSigninConfig, 'teamId' | 'keyId' | 'privateKeyPem'>,
  clientId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  const enc = new TextEncoder();
  const header = base64Url(enc.encode(JSON.stringify({ alg: 'ES256', kid: config.keyId, typ: 'JWT' })));
  const payload = base64Url(enc.encode(JSON.stringify({
    iss: config.teamId,
    iat: nowSeconds,
    exp: nowSeconds + 300,
    aud: APPLE_AUDIENCE,
    sub: clientId,
  })));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(config.privateKeyPem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  // WebCrypto returns the raw r||s (IEEE P1363) form JWS expects.
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${payload}`));
  return `${header}.${payload}.${base64Url(sig)}`;
}

/** True if the Supabase user signed in with Apple. */
export function isAppleUser(user: {
  app_metadata?: { provider?: string; providers?: string[] };
  identities?: Array<{ provider?: string }> | null;
}): boolean {
  return Boolean(
    user.app_metadata?.provider === 'apple' ||
    user.app_metadata?.providers?.includes('apple') ||
    user.identities?.some((i) => i.provider === 'apple'),
  );
}

/**
 * Exchange the authorization code and revoke the resulting token.
 * Never throws; returns a status for logging and the API response.
 */
export async function revokeAppleSignin(params: {
  config: AppleSigninConfig | null;
  authorizationCode?: string | null;
  clientKind?: AppleClientKind;
  fetchFn?: (url: string, init?: RequestInit) => Promise<Response>;
  log?: (message: string) => void;
}): Promise<AppleRevocationStatus> {
  const { config, authorizationCode, fetchFn = fetch, log = console.warn } = params;
  const kind: AppleClientKind = params.clientKind === 'web' ? 'web' : 'native';
  if (!config) {
    log('[APPLE] Sign in with Apple secrets not configured; token not revoked');
    return 'not_configured';
  }
  const clientId = config.clientIds[kind];
  if (!clientId) {
    log(`[APPLE] No client id configured for ${kind} codes; token not revoked`);
    return 'not_configured';
  }
  if (!authorizationCode || typeof authorizationCode !== 'string') {
    log('[APPLE] No Apple authorization code supplied; token not revoked');
    return 'no_authorization_code';
  }
  try {
    const clientSecret = await createAppleClientSecret(config, clientId);
    const form = (fields: Record<string, string>) => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
    });

    const tokenRes = await fetchFn(`${APPLE_AUDIENCE}/auth/token`, form({
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }));
    if (!tokenRes.ok) {
      log(`[APPLE] Authorization code exchange failed: HTTP ${tokenRes.status}`);
      return 'failed';
    }
    const tokens = await tokenRes.json() as { refresh_token?: string; access_token?: string };
    const token = tokens.refresh_token ?? tokens.access_token;
    if (!token) {
      log('[APPLE] Code exchange returned no token');
      return 'failed';
    }

    const revokeRes = await fetchFn(`${APPLE_AUDIENCE}/auth/revoke`, form({
      client_id: clientId,
      client_secret: clientSecret,
      token,
      token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
    }));
    if (!revokeRes.ok) {
      log(`[APPLE] Token revocation failed: HTTP ${revokeRes.status}`);
      return 'failed';
    }
    return 'revoked';
  } catch (error) {
    log(`[APPLE] Revocation error: ${error instanceof Error ? error.message : String(error)}`);
    return 'failed';
  }
}
