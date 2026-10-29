/**
 * BH-145: only accept sign-in tokens from a URL when this device started a
 * sign-in moments ago.
 *
 * The Lovable OAuth broker returns the session tokens in the URL hash and we
 * cannot pass our own `state` through it, so without this a crafted link such
 * as https://getgridsense.com/auth/callback#access_token=A&refresh_token=B
 * would silently sign the victim into the attacker's account (login CSRF).
 *
 * `markOAuthStart()` runs right before we hand off to the broker. The return
 * path calls `consumeOAuthStart()`, which succeeds once, only within
 * OAUTH_INTENT_TTL_MS, and only on the same device/storage.
 */

export const OAUTH_INTENT_KEY = 'gs.oauthIntent';
/** Long enough to finish Google/Apple sign-in, short enough to limit replay. */
export const OAUTH_INTENT_TTL_MS = 10 * 60 * 1000;

type IntentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface StoredIntent {
  nonce: string;
  startedAt: number;
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function defaultStorage(): IntentStorage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Record that the user just started a Google/Apple sign-in on this device. */
export function markOAuthStart(
  storage: IntentStorage | null = defaultStorage(),
  now: number = Date.now(),
): string {
  const nonce = randomNonce();
  try {
    storage?.setItem(OAUTH_INTENT_KEY, JSON.stringify({ nonce, startedAt: now }));
  } catch {
    // storage full or blocked: the return will be rejected, which is the safe side
  }
  return nonce;
}

/** Forget a started sign-in (e.g. the broker call failed before redirecting). */
export function clearOAuthStart(storage: IntentStorage | null = defaultStorage()): void {
  try {
    storage?.removeItem(OAUTH_INTENT_KEY);
  } catch {
    // ignore
  }
}

/** True once if a sign-in was started here within the TTL. Always clears the marker. */
export function consumeOAuthStart(
  storage: IntentStorage | null = defaultStorage(),
  now: number = Date.now(),
): boolean {
  if (!storage) return false;
  let raw: string | null = null;
  try {
    raw = storage.getItem(OAUTH_INTENT_KEY);
    storage.removeItem(OAUTH_INTENT_KEY);
  } catch {
    return false;
  }
  if (!raw) return false;
  try {
    const intent = JSON.parse(raw) as Partial<StoredIntent>;
    if (typeof intent.nonce !== 'string' || intent.nonce.length < 16) return false;
    if (typeof intent.startedAt !== 'number') return false;
    const age = now - intent.startedAt;
    return age >= 0 && age <= OAUTH_INTENT_TTL_MS;
  } catch {
    return false;
  }
}
