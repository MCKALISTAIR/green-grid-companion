/**
 * Optional-analytics consent (UK GDPR / PECR).
 *
 * The cookie banner records one of two choices:
 * - "accepted": optional diagnostics may run (Sentry performance tracing and
 *   Session Replay, see src/lib/monitoring.ts).
 * - "declined": only what the app needs to work runs. Crash reports without
 *   replay still go to Sentry; they set no cookies and store nothing on the device.
 *
 * Choices made before CONSENT_VERSION existed were not real choices (onboarding
 * used to write "accepted" automatically), so they are ignored and the banner
 * asks again once.
 */

export type ConsentChoice = 'accepted' | 'declined';

export const CONSENT_STORAGE_KEY = 'cookie-consent';
export const CONSENT_VERSION_KEY = 'cookie-consent-version';
export const CONSENT_VERSION = '2';
export const CONSENT_CHANGE_EVENT = 'gridsense:consent-change';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** The user's current choice, or null when they have not chosen yet. */
export function getConsent(): ConsentChoice | null {
  const store = storage();
  if (!store) return null;
  if (store.getItem(CONSENT_VERSION_KEY) !== CONSENT_VERSION) return null;
  const value = store.getItem(CONSENT_STORAGE_KEY);
  return value === 'accepted' || value === 'declined' ? value : null;
}

export function hasOptionalConsent(): boolean {
  return getConsent() === 'accepted';
}

export function setConsent(choice: ConsentChoice): void {
  const store = storage();
  if (store) {
    store.setItem(CONSENT_STORAGE_KEY, choice);
    store.setItem(CONSENT_VERSION_KEY, CONSENT_VERSION);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ConsentChoice | null>(CONSENT_CHANGE_EVENT, { detail: choice }));
  }
}

export function clearConsent(): void {
  const store = storage();
  if (store) {
    store.removeItem(CONSENT_STORAGE_KEY);
    store.removeItem(CONSENT_VERSION_KEY);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ConsentChoice | null>(CONSENT_CHANGE_EVENT, { detail: null }));
  }
}

/** Subscribe to consent changes. Returns an unsubscribe function. */
export function onConsentChange(listener: (choice: ConsentChoice | null) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => listener((event as CustomEvent<ConsentChoice | null>).detail ?? null);
  window.addEventListener(CONSENT_CHANGE_EVENT, handler);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handler);
}

/** Human-readable label for Settings. */
export function describeConsent(choice: ConsentChoice | null): string {
  if (choice === 'accepted') return 'Optional diagnostics allowed';
  if (choice === 'declined') return 'Essential only';
  return 'Not yet set';
}
