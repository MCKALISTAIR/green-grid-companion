import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SERVER_OUTLOOK_KEY,
  isServerOutlookActive,
  readServerOutlook,
  syncDailyOutlookSubscription,
  type SyncOptions,
} from './dailyOutlookServer';

function okResponse(data: Record<string, unknown>, pushDelivery: unknown = 'configured') {
  return new Response(JSON.stringify({ data, push_delivery: pushDelivery }), { status: 200 });
}

function opts(over: Partial<SyncOptions> = {}): SyncOptions {
  return {
    enabled: true,
    time: '07:30',
    postcode: 'SW1A',
    getToken: async () => 'tok-123',
    platform: 'ios',
    isSandbox: false,
    baseUrl: 'https://example.supabase.co',
    apiKey: 'anon',
    accessToken: 'jwt',
    now: () => new Date('2026-10-22T18:00:00Z'),
    ...over,
  };
}

describe('syncDailyOutlookSubscription (BH-73)', () => {
  beforeEach(() => localStorage.clear());

  it('upserts token, region and London time, and confirms only on a matching echo', async () => {
    const fetchImpl = vi.fn(async () =>
      okResponse({
        device_token: 'tok-123',
        postcode: 'SW1A',
        daily_forecast_enabled: true,
        daily_forecast_time: '07:30:00',
      }),
    );
    const r = await syncDailyOutlookSubscription(opts({ fetchImpl }));
    expect(r.status).toBe('confirmed');
    expect(r.confirmation).toMatchObject({
      deviceToken: 'tok-123',
      time: '07:30',
      postcode: 'SW1A',
    });
    expect(readServerOutlook()).toEqual(r.confirmation);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.supabase.co/functions/v1/push-subscriptions?action=upsert');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      device_token: 'tok-123',
      postcode: 'SW1A',
      daily_forecast_enabled: true,
      daily_forecast_time: '07:30',
      platform: 'ios',
    });
    // Low/high alerts stay on the phone; the server must not double them.
    expect(body.low_intensity_enabled).toBeUndefined();
    expect(body.high_intensity_enabled).toBeUndefined();
  });

  it('requires a push token: no token means no request and no confirmation', async () => {
    const fetchImpl = vi.fn();
    const r = await syncDailyOutlookSubscription(opts({ getToken: async () => null, fetchImpl }));
    expect(r).toEqual({ status: 'no-token', confirmation: null });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(localStorage.getItem(SERVER_OUTLOOK_KEY)).toBeNull();
  });

  it('a throwing token getter is treated as no token', async () => {
    const r = await syncDailyOutlookSubscription(
      opts({
        getToken: async () => {
          throw new Error('no APNs');
        },
        fetchImpl: vi.fn(),
      }),
    );
    expect(r.status).toBe('no-token');
  });

  it('requires a region', async () => {
    const fetchImpl = vi.fn();
    const r = await syncDailyOutlookSubscription(opts({ postcode: '', fetchImpl }));
    expect(r.status).toBe('no-postcode');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    ['server error', new Response('{"error":"x"}', { status: 500 })],
    ['attestation 403', new Response('{"error":"x"}', { status: 403 })],
    [
      'different token echoed',
      okResponse({
        device_token: 'other',
        daily_forecast_enabled: true,
        daily_forecast_time: '07:30:00',
      }),
    ],
    [
      'stale time echoed',
      okResponse({
        device_token: 'tok-123',
        daily_forecast_enabled: true,
        daily_forecast_time: '09:00:00',
      }),
    ],
    [
      'not enabled',
      okResponse({
        device_token: 'tok-123',
        daily_forecast_enabled: false,
        daily_forecast_time: '07:30:00',
      }),
    ],
  ])('%s: not confirmed and any old confirmation is cleared', async (_name, response) => {
    localStorage.setItem(
      SERVER_OUTLOOK_KEY,
      JSON.stringify({ deviceToken: 'tok-123', time: '07:30', postcode: 'SW1A', confirmedAt: 'x' }),
    );
    const r = await syncDailyOutlookSubscription(opts({ fetchImpl: vi.fn(async () => response) }));
    expect(r.status).toBe('failed');
    expect(readServerOutlook()).toBeNull();
  });

  it('network failure is not confirmed', async () => {
    const r = await syncDailyOutlookSubscription(
      opts({
        fetchImpl: vi.fn(async () => {
          throw new TypeError('offline');
        }),
      }),
    );
    expect(r.status).toBe('failed');
  });

  it('switching off clears the confirmation and tells the server', async () => {
    localStorage.setItem(
      SERVER_OUTLOOK_KEY,
      JSON.stringify({ deviceToken: 'tok-123', time: '07:30', postcode: 'SW1A', confirmedAt: 'x' }),
    );
    const fetchImpl = vi.fn(async () => okResponse({}));
    const getToken = vi.fn(async () => 'tok-123');
    const r = await syncDailyOutlookSubscription(opts({ enabled: false, fetchImpl, getToken }));
    expect(r.status).toBe('disabled');
    expect(readServerOutlook()).toBeNull();
    expect(getToken).not.toHaveBeenCalled();
    const body = JSON.parse(
      (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body).toMatchObject({ device_token: 'tok-123', daily_forecast_enabled: false });
  });
});

describe('isServerOutlookActive', () => {
  const c = { deviceToken: 't', time: '07:30', postcode: 'SW1A', confirmedAt: 'x' };
  it('only when enabled and the confirmed time matches', () => {
    expect(
      isServerOutlookActive(c, { dailyForecastEnabled: true, dailyForecastTime: '07:30' }),
    ).toBe(true);
    expect(
      isServerOutlookActive(c, { dailyForecastEnabled: true, dailyForecastTime: '08:00' }),
    ).toBe(false);
    expect(
      isServerOutlookActive(c, { dailyForecastEnabled: false, dailyForecastTime: '07:30' }),
    ).toBe(false);
    expect(
      isServerOutlookActive(null, { dailyForecastEnabled: true, dailyForecastTime: '07:30' }),
    ).toBe(false);
  });
});

describe('syncDailyOutlookSubscription: server push not configured', () => {
  beforeEach(() => localStorage.clear());
  const echo = {
    device_token: 'tok-123',
    postcode: 'SW1A',
    daily_forecast_enabled: true,
    daily_forecast_time: '07:30:00',
  };

  it("treats push_delivery 'not_configured' as not confirmed, so the phone push stays", async () => {
    localStorage.setItem(
      SERVER_OUTLOOK_KEY,
      JSON.stringify({ deviceToken: 'tok-123', time: '07:30', postcode: 'SW1A', confirmedAt: 'x' }),
    );
    const fetchImpl = vi.fn(async () => okResponse(echo, 'not_configured'));
    const r = await syncDailyOutlookSubscription(opts({ fetchImpl }));
    expect(r).toEqual({ status: 'not-configured', confirmation: null });
    expect(readServerOutlook()).toBeNull();
    expect(
      isServerOutlookActive(readServerOutlook(), {
        dailyForecastEnabled: true,
        dailyForecastTime: '07:30',
      }),
    ).toBe(false);
  });

  it('treats a response without push_delivery (older server) as not confirmed', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ data: echo }), { status: 200 }),
    );
    const r = await syncDailyOutlookSubscription(opts({ fetchImpl }));
    expect(r.status).toBe('not-configured');
    expect(readServerOutlook()).toBeNull();
  });
});
