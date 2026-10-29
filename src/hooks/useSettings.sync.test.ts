import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// BH-133: a failed first load used to stop settings syncing for the whole
// session, and a new account with no saved settings got the previous user's
// local settings uploaded to it.

const auth = { session: null as null | { user: { id: string } } };
const load = vi.fn();
const upsert = vi.fn(async (_row: { user_id: string; settings: Record<string, unknown> }) => ({
  error: null,
}));
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
        select: () => ({ eq: () => ({ single: () => load() }) }),
      }),
      channel: () => channel,
      removeChannel: () => {},
    },
  };
});

import { useSettings, SETTINGS_OWNER_KEY } from './useSettings';

const NOT_FOUND = { data: null, error: { code: 'PGRST116' } };
const FAIL = { data: null, error: { code: 'PGRST301', message: 'JWT expired' } };

describe('useSettings server sync (BH-133)', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.session = { user: { id: 'user-b' } };
    load.mockReset();
    upsert.mockClear();
  });

  it('retries a failed initial load and then saves later changes', async () => {
    load.mockResolvedValueOnce(FAIL).mockResolvedValue(NOT_FOUND);
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    // Coming back to the app retries straight away.
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));

    act(() => result.current.setCustomAnnualKwh(4100));
    await waitFor(
      () =>
        expect(upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'user-b',
            settings: expect.objectContaining({ customAnnualKwh: 4100 }),
          }),
          expect.anything(),
        ),
      { timeout: 3000 },
    );
  });

  it("never uploads another account's local settings to a new account", async () => {
    localStorage.setItem(
      'grid-companion-settings',
      JSON.stringify({ houseType: 'large', customAnnualKwh: 9999 }),
    );
    localStorage.setItem(SETTINGS_OWNER_KEY, 'user-a');
    load.mockResolvedValue(NOT_FOUND);
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.customAnnualKwh).toBe(2900));
    await new Promise((r) => setTimeout(r, 1500));
    for (const [row] of upsert.mock.calls) {
      expect(row.settings.customAnnualKwh).not.toBe(9999);
    }
    expect(localStorage.getItem(SETTINGS_OWNER_KEY)).toBe('user-b');
  });

  it("still uploads this device's settings for a first sign-in (no owner yet)", async () => {
    localStorage.setItem('grid-companion-settings', JSON.stringify({ customAnnualKwh: 3300 }));
    load.mockResolvedValue(NOT_FOUND);
    renderHook(() => useSettings());
    await waitFor(() =>
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({ settings: expect.objectContaining({ customAnnualKwh: 3300 }) }),
        expect.anything(),
      ),
    );
  });
});
