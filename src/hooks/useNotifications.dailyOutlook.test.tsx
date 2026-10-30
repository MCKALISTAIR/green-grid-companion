import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ln = vi.hoisted(() => ({
  checkPermissions: vi.fn(async () => ({ display: 'granted' })),
  schedule: vi.fn(async () => ({})),
  cancel: vi.fn(async () => {}),
  getPending: vi.fn(async () => ({ notifications: [] })),
}));
const sync = vi.hoisted(() => ({ result: { status: 'no-token', confirmation: null } as unknown }));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
}));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: ln }));
vi.mock('@transistorsoft/capacitor-background-fetch', () => ({
  BackgroundFetch: {
    stop: vi.fn(async () => {}),
    configure: vi.fn(async () => 0),
    finish: vi.fn(),
  },
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));
const ensure = vi.hoisted(() => vi.fn(async () => ({ access_token: 'anon-jwt' }) as unknown));
vi.mock('@/lib/auth-utils', () => ({ ensureAuthSession: ensure }));
vi.mock('@/lib/nativePushToken', () => ({ getNativePushToken: async () => 'tok-1' }));
vi.mock('@/lib/dailyOutlookServer', async (orig) => {
  const real = await orig<typeof import('@/lib/dailyOutlookServer')>();
  return {
    ...real,
    syncDailyOutlookSubscription: vi.fn(async () => sync.result),
  };
});

import { useNotifications } from './useNotifications';
import { NOTIFICATION_IDS } from '@/lib/notificationIds';
import { SERVER_OUTLOOK_KEY, syncDailyOutlookSubscription } from '@/lib/dailyOutlookServer';
import type { ForecastData } from '@/lib/carbonApi';

const forecast = [
  {
    from: '2026-10-23T06:00Z',
    to: '2026-10-23T06:30Z',
    intensity: { forecast: 120, index: 'moderate' },
  },
] as unknown as ForecastData[];

function enablePrefs(time = '07:30') {
  localStorage.setItem(
    'gridgreen-notification-prefs',
    JSON.stringify({ dailyForecastEnabled: true, dailyForecastTime: time }),
  );
}

const dailyScheduled = () =>
  ln.schedule.mock.calls.some((c) =>
    (c as unknown as [{ notifications: { id: number }[] }])[0].notifications.some(
      (n) => n.id === NOTIFICATION_IDS.DAILY_FORECAST,
    ),
  );

describe('useNotifications daily outlook: server or phone, never both (BH-73)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    sync.result = { status: 'no-token', confirmation: null };
  });

  it('no confirmed server subscription: the phone schedules the fallback', async () => {
    enablePrefs();
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.permissionStatus).toBe('granted'));
    await act(() => result.current.scheduleDailyForecast(forecast));
    expect(dailyScheduled()).toBe(true);
    expect(result.current.dailyOutlookViaServer).toBe(false);
  });

  it('confirmed for this time: the phone copy is cancelled, not scheduled', async () => {
    enablePrefs('07:30');
    localStorage.setItem(
      SERVER_OUTLOOK_KEY,
      JSON.stringify({ deviceToken: 'tok-1', time: '07:30', postcode: 'SW1A', confirmedAt: 'x' }),
    );
    sync.result = {
      status: 'confirmed',
      confirmation: { deviceToken: 'tok-1', time: '07:30', postcode: 'SW1A', confirmedAt: 'x' },
    };
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.permissionStatus).toBe('granted'));
    await act(() => result.current.scheduleDailyForecast(forecast));
    expect(dailyScheduled()).toBe(false);
    expect(ln.cancel).toHaveBeenCalledWith({
      notifications: [{ id: NOTIFICATION_IDS.DAILY_FORECAST }],
    });
    expect(result.current.dailyOutlookViaServer).toBe(true);
  });

  it('confirmation for an old time does not suppress the phone copy', async () => {
    enablePrefs('08:00');
    localStorage.setItem(
      SERVER_OUTLOOK_KEY,
      JSON.stringify({ deviceToken: 'tok-1', time: '07:30', postcode: 'SW1A', confirmedAt: 'x' }),
    );
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.permissionStatus).toBe('granted'));
    await act(() => result.current.scheduleDailyForecast(forecast));
    expect(dailyScheduled()).toBe(true);
  });

  it('syncs the switch and time to the server with the saved region', async () => {
    enablePrefs('07:30');
    localStorage.setItem('gridgreen-postcode', 'EH1');
    renderHook(() => useNotifications());
    await waitFor(() => expect(syncDailyOutlookSubscription).toHaveBeenCalled(), { timeout: 3000 });
    expect(vi.mocked(syncDailyOutlookSubscription).mock.calls[0][0]).toMatchObject({
      enabled: true,
      time: '07:30',
      postcode: 'EH1',
      platform: 'ios',
    });
  });

  it('native sync gets its token through ensureAuthSession (BH-149)', async () => {
    enablePrefs('07:30');
    localStorage.setItem('gridgreen-postcode', 'EH1');
    ensure.mockClear();
    renderHook(() => useNotifications());
    await waitFor(() => expect(syncDailyOutlookSubscription).toHaveBeenCalled(), { timeout: 3000 });
    const opts = vi.mocked(syncDailyOutlookSubscription).mock.calls.at(-1)![0];
    expect(opts.accessToken).toBeUndefined();
    await expect(opts.getAccessToken!()).resolves.toBe('anon-jwt');
    expect(ensure).toHaveBeenCalled();
    ensure.mockResolvedValueOnce(null);
    await expect(opts.getAccessToken!()).resolves.toBeNull();
  });
});
