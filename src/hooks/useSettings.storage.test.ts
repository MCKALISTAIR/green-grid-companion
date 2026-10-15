import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

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

const auth = { session: null as null | { user: { id: string } } };
const dbRow = { settings: null as null | Record<string, unknown> };
const upsert = vi.fn(async () => ({ error: null }));
vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return {
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: auth.session } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from: () => ({
        upsert,
        select: () => ({
          eq: () => ({
            single: async () =>
              dbRow.settings
                ? { data: { settings: dbRow.settings }, error: null }
                : { data: null, error: { code: 'PGRST116' } },
          }),
        }),
      }),
      channel: () => channel,
      removeChannel: () => {},
    },
  };
});

import { useSettings } from './useSettings';
import { hydrateAppStorage, __resetAppStorageForTests } from '@/lib/appStorage';

describe('useSettings persistence on native storage', () => {
  beforeEach(async () => {
    prefs.clear();
    localStorage.clear();
    auth.session = null;
    dbRow.settings = null;
    upsert.mockClear();
    __resetAppStorageForTests();
    await hydrateAppStorage(true);
  });

  it('signed out: settings survive a relaunch with no flash of defaults', async () => {
    const first = renderHook(() => useSettings());
    act(() => first.result.current.setHouseType('flat' as never));
    first.unmount();
    await new Promise((r) => setTimeout(r, 0));

    localStorage.clear();
    __resetAppStorageForTests();
    await hydrateAppStorage(true);
    const second = renderHook(() => useSettings());
    // First render already has the saved value (hydrated before render).
    expect(second.result.current.houseType).toBe('flat');
  });

  it('signed in: database settings merge over defaults', async () => {
    auth.session = { user: { id: 'u1' } };
    dbRow.settings = { customAnnualKwh: 4100 };
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.customAnnualKwh).toBe(4100));
    expect(result.current.settings.showGridFrequency).toBe(false);
  });

  it('signed in with empty DB: local settings are pushed up', async () => {
    const pre = renderHook(() => useSettings());
    act(() => pre.result.current.updateSetting('customAnnualKwh', 3333));
    pre.unmount();
    auth.session = { user: { id: 'u1' } };
    renderHook(() => useSettings());
    await waitFor(() => expect(upsert).toHaveBeenCalled());
    const calls = upsert.mock.calls as unknown as Array<
      [{ settings: { customAnnualKwh: number } }]
    >;
    expect(calls[0][0].settings.customAnnualKwh).toBe(3333);
  });
});
