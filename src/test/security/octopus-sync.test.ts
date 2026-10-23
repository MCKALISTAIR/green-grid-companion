import { describe, it, expect } from 'vitest';
import {
  calculateMeterFootprint,
  credentialsUnavailableResult,
  summarise,
  syncMeter,
} from '../../../supabase/functions/_shared/octopus-sync.ts';
import {
  makeFetch,
  makeStore,
  octopusReadings,
} from '../../../supabase/functions/_shared/octopus_test_harness.ts';

// BH-91: the Octopus footprint pipeline, run against mocked Octopus/NESO fetches only.
const MPAN = '1300000000000';
const AUTH = 'Basic dGVzdDo='; // dummy
const HH = 1_800_000;
const DAY = 86_400_000;
const meter = { userId: 'u1', mpan: MPAN, serial: '21L0000000', authHeader: AUTH };

describe('Octopus sync pipeline (BH-91)', () => {
  it('writes footprints for summer readings Octopus spells with +01:00', async () => {
    const t = Date.UTC(2026, 6, 30, 20, 0);
    const readings = octopusReadings(t, t + 4 * HH);
    expect(readings[0].interval_start).toBe('2026-07-30T21:00:00+01:00');
    const { fetchFn } = makeFetch({ pages: [readings] });
    const { store, calls } = makeStore({ latest: '2026-07-30T20:00:00+00:00' });
    const r = await syncMeter({ fetch: fetchFn, store, now: () => new Date(t + DAY) }, meter);
    expect(r).toMatchObject({
      ok: true,
      http_status: 200,
      readings_stored: 4,
      footprints_written: 4,
    });
    expect(calls.footprint.flat()[0].interval_start).toBe('2026-07-30T20:00:00.000Z');
    expect(calls.marked).toHaveLength(1);
  });

  it('matches all 50 half-hours of 25 Oct 2026 without merging the repeated hour', async () => {
    const start = Date.UTC(2026, 9, 24, 23, 0);
    const readings = octopusReadings(start, Date.UTC(2026, 9, 26, 0, 0), 1);
    expect(readings).toHaveLength(50);
    const { fetchFn } = makeFetch({ pages: [readings] });
    const { store, calls } = makeStore({ latest: '2026-10-24T22:00:00+00:00' });
    const r = await syncMeter(
      { fetch: fetchFn, store, now: () => new Date('2026-10-26T06:00:00Z') },
      meter,
    );
    expect(r.footprints_written).toBe(50);
    expect(new Set(calls.footprint.flat().map((f) => f.interval_start)).size).toBe(50);
  });

  it('calculate path matches DB "+00:00" rows to NESO "Z" half-hours', async () => {
    const { fetchFn } = makeFetch();
    const { store } = makeStore({
      recent: [
        {
          interval_start: '2026-07-30T22:30:00+00:00',
          interval_end: '2026-07-30T23:00:00+00:00',
          consumption_kwh: 0.25,
        },
      ],
    });
    const r = await calculateMeterFootprint({ fetch: fetchFn, store }, MPAN);
    expect(r).toMatchObject({ ok: true, readings: 1, footprints_written: 1 });
  });

  it('Octopus 401: error with status, last_sync_at untouched', async () => {
    const { fetchFn } = makeFetch({ octopusStatus: 401 });
    const { store, calls } = makeStore();
    const r = await syncMeter({ fetch: fetchFn, store }, meter);
    expect(r).toMatchObject({ ok: false, http_status: 401, last_sync_updated: false });
    expect(calls.marked).toHaveLength(0);
  });

  it('counts credentials-unavailable as an error', () => {
    const s = summarise([credentialsUnavailableResult(MPAN, 'credentials_unavailable')]);
    expect(s).toMatchObject({ success: false, meters_ok: 0, errors: 1 });
  });

  it('reports DB write failures instead of claiming success', async () => {
    const t = Date.UTC(2026, 9, 20);
    const { fetchFn } = makeFetch({ pages: [octopusReadings(t, t + 2 * HH)] });
    const { store, calls } = makeStore({ consumptionErrorOnCall: 1 });
    const r = await syncMeter({ fetch: fetchFn, store, now: () => new Date(t + DAY) }, meter);
    expect(r.ok).toBe(false);
    expect(r.readings_stored).toBe(0);
    expect(calls.marked).toHaveLength(0);
  });
});
