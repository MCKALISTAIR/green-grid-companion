/**
 * App storage: one synchronous key/value API for app state.
 *
 * - Web: reads and writes go straight to localStorage (unchanged behaviour).
 * - Native (iOS/Android): backed by @capacitor/preferences (UserDefaults /
 *   SharedPreferences), which WKWebView can't evict like localStorage. Values
 *   live in an in-memory cache that `hydrateAppStorage()` fills before React
 *   first renders, so reads stay synchronous and there's no flash of defaults.
 *   Writes update the cache immediately and persist in the background, and are
 *   mirrored to localStorage so older code paths and the web keys stay in step.
 * - Keys not in MIGRATED_KEYS pass straight through to localStorage.
 * - Migration: on the first native launch with this build, existing values of
 *   the migrated keys are copied from localStorage into Preferences once.
 */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export const MIGRATED_KEYS = [
  'grid-companion-settings',
  'grid-companion-last-sync',
  'gridgreen-postcode',
  'gridgreen-saved-locations',
  'gridgreen-recent-locations',
  'gridgreen-notification-prefs',
  'onboarding_complete',
  'product_tour_seen',
  'planner-onboarding-seen',
  'history-chart-tip-seen',
  'gridsense-first-number-pending',
  'gridsense-session-count',
  'gridsense-useful-moment',
  'gridsense-notification-nudge',
  'cookie-consent',
  'cookie-consent-version',
  'gridgreen-achievements-v1',
  'fuel-streaks-v3',
  'fuel-streak-records-v2',
  'fuel-last-seen-v1',
  'gridsense-trophy-seen-at',
] as const;

export const MIGRATION_FLAG = 'gridsense-storage-migrated-v1';

const cache = new Map<string, string>();
const managed = new Set<string>(MIGRATED_KEYS);
let nativeMode = false;

function local(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Fill the cache from Preferences (native only). Await before first render. */
export async function hydrateAppStorage(
  isNative: boolean = Capacitor.isNativePlatform(),
): Promise<void> {
  if (!isNative) {
    nativeMode = false;
    return;
  }
  try {
    const { value: migrated } = await Preferences.get({ key: MIGRATION_FLAG });
    if (!migrated) {
      const ls = local();
      for (const key of MIGRATED_KEYS) {
        const v = ls?.getItem(key);
        if (v !== null && v !== undefined) await Preferences.set({ key, value: v });
      }
      await Preferences.set({ key: MIGRATION_FLAG, value: '1' });
    }
    cache.clear();
    for (const key of MIGRATED_KEYS) {
      const { value } = await Preferences.get({ key });
      if (value !== null) cache.set(key, value);
    }
    nativeMode = true;
  } catch {
    // Preferences unavailable: fall back to localStorage so the app still works.
    nativeMode = false;
  }
}

function persist(op: Promise<unknown>) {
  op.catch(() => {
    /* best effort; the cache and localStorage mirror still hold the value */
  });
}

export const appStorage = {
  getItem(key: string): string | null {
    if (nativeMode && managed.has(key)) return cache.has(key) ? (cache.get(key) as string) : null;
    return local()?.getItem(key) ?? null;
  },
  setItem(key: string, value: string): void {
    if (nativeMode && managed.has(key)) {
      cache.set(key, value);
      persist(Preferences.set({ key, value }));
    }
    try {
      local()?.setItem(key, value);
    } catch {
      /* quota or private mode */
    }
  },
  removeItem(key: string): void {
    if (nativeMode && managed.has(key)) {
      cache.delete(key);
      persist(Preferences.remove({ key }));
    }
    local()?.removeItem(key);
  },
  /** Remove every migrated key (used by account deletion). */
  clearAll(): void {
    for (const key of MIGRATED_KEYS) this.removeItem(key);
  },
};

/** Test helper. */
export function __resetAppStorageForTests() {
  cache.clear();
  nativeMode = false;
}
