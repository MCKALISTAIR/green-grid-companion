import { describe, it, expect, beforeEach, vi } from 'vitest';

const prefs = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: prefs.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      prefs.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      prefs.delete(key);
    }),
  },
}));

import {
  appStorage,
  hydrateAppStorage,
  MIGRATION_FLAG,
  __resetAppStorageForTests,
} from './appStorage';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('appStorage', () => {
  beforeEach(() => {
    prefs.clear();
    localStorage.clear();
    __resetAppStorageForTests();
  });

  it('web: reads and writes localStorage directly', async () => {
    await hydrateAppStorage(false);
    appStorage.setItem('grid-companion-settings', '{"a":1}');
    expect(localStorage.getItem('grid-companion-settings')).toBe('{"a":1}');
    expect(prefs.size).toBe(0);
  });

  it('native: migrates existing localStorage keys once', async () => {
    localStorage.setItem('gridgreen-postcode', 'EH1');
    localStorage.setItem('cookie-consent', 'declined');
    await hydrateAppStorage(true);
    expect(prefs.get('gridgreen-postcode')).toBe('EH1');
    expect(prefs.get(MIGRATION_FLAG)).toBe('1');
    expect(appStorage.getItem('cookie-consent')).toBe('declined');

    // A later localStorage value is not re-migrated over Preferences.
    localStorage.setItem('gridgreen-postcode', 'G1');
    __resetAppStorageForTests();
    await hydrateAppStorage(true);
    expect(appStorage.getItem('gridgreen-postcode')).toBe('EH1');
  });

  it('native: settings survive a relaunch even if WebView storage is wiped', async () => {
    await hydrateAppStorage(true);
    appStorage.setItem('grid-companion-settings', '{"houseType":"flat"}');
    await flush();
    localStorage.clear(); // iOS evicted WebView data
    __resetAppStorageForTests(); // relaunch
    await hydrateAppStorage(true);
    expect(appStorage.getItem('grid-companion-settings')).toBe('{"houseType":"flat"}');
  });

  it('native: unmanaged keys pass through to localStorage', async () => {
    await hydrateAppStorage(true);
    appStorage.setItem('gridgreen-coords', 'x');
    expect(localStorage.getItem('gridgreen-coords')).toBe('x');
    expect(prefs.has('gridgreen-coords')).toBe(false);
  });

  it('clearAll removes managed keys from both stores', async () => {
    await hydrateAppStorage(true);
    appStorage.setItem('onboarding_complete', 'true');
    await flush();
    appStorage.clearAll();
    await flush();
    expect(appStorage.getItem('onboarding_complete')).toBeNull();
    expect(prefs.has('onboarding_complete')).toBe(false);
    expect(localStorage.getItem('onboarding_complete')).toBeNull();
  });
});
