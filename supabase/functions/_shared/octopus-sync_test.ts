import { assert, assertEquals } from 'jsr:@std/assert@1';
import {
  calculateMeterFootprint,
  computeSyncFrom,
  credentialsUnavailableResult,
  fetchOctopusConsumption,
  nesoWindows,
  summarise,
  syncMeter,
  SYNC_LOOKBACK_CAP_DAYS,
} from './octopus-sync.ts';
import { halfHourKey } from './half-hour.ts';
import {
  fakeIntensity,
  makeFetch,
  makeStore,
  octopusReadings,
  octopusStamp,
} from './octopus_test_harness.ts';

// BH-91 pipeline tests. All Octopus/NESO traffic is mocked (makeFetch); no real keys.
const MPAN = '1300000000000'; // region 6 (MPAN prefix 13)
const SERIAL = '21L0000000';
const AUTH = 'Basic dGVzdDo='; // "test:" — a dummy, never a real key
const DAY = 86_400_000;
const HH = 1_800_000;

Deno.test('octopusStamp spells BST as +01:00 and GMT as Z, like Octopus', () => {
  assertEquals(octopusStamp(Date.UTC(2026, 6, 30, 22, 30)), '2026-07-30T23:30:00+01:00');
  assertEquals(octopusStamp(Date.UTC(2026, 9, 25, 0, 30)), '2026-10-25T01:30:00+01:00');
  assertEquals(octopusStamp(Date.UTC(2026, 9, 25, 1, 30)), '2026-10-25T01:30:00Z');
});

Deno.test('syncMeter: summer +01:00 readings get footprints (the bug)', async () => {
  const now = new Date('2026-07-31T06:00:00Z');
  const from = Date.UTC(2026, 6, 30, 20, 0);
  const readings = octopusReadings(from, from + 4 * HH, 0.5);
  const { fetchFn, urls } = makeFetch({ pages: [readings] });
  const { store, calls } = makeStore({ latest: '2026-07-30T20:00:00+00:00' });
  const r = await syncMeter(
    { fetch: fetchFn, store, now: () => now },
    {
      userId: 'u1',
      mpan: MPAN,
      serial: SERIAL,
      authHeader: AUTH,
    },
  );
  assertEquals(r.ok, true);
  assertEquals(r.http_status, 200);
  assertEquals(r.readings_fetched, 4);
  assertEquals(r.readings_stored, 4);
  assertEquals(r.footprints_written, 4);
  assertEquals(r.last_sync_updated, true);
  assertEquals(r.mpan, '…0000');
  const fp = calls.footprint.flat();
  assertEquals(fp[0].interval_start, '2026-07-30T20:00:00.000Z');
  assertEquals(fp[0].intensity_gco2_kwh, fakeIntensity(halfHourKey('2026-07-30T20:00Z')!));
  assertEquals(fp[0].carbon_g, 0.5 * fp[0].intensity_gco2_kwh);
  // Stored readings use the canonical UTC spelling.
  assertEquals(calls.consumption[0][0].interval_start, '2026-07-30T20:00:00.000Z');
  assert(urls.some((u) => u.includes('/regional/intensity/') && u.endsWith('/regionid/6')));
  assertEquals(calls.marked.length, 1);
});

Deno.test('syncMeter: 25 Oct 2026 day has 50 half-hours, all matched, none merged', async () => {
  const dayStart = Date.UTC(2026, 9, 24, 23, 0); // 00:00 BST, 25 Oct
  const dayEnd = Date.UTC(2026, 9, 26, 0, 0); // 00:00 GMT, 26 Oct
  const readings = octopusReadings(dayStart, dayEnd, 1);
  assertEquals(readings.length, 50);
  const repeated = readings.filter((r) => r.interval_start.startsWith('2026-10-25T01:'));
  assertEquals(
    repeated.map((r) => r.interval_start),
    [
      '2026-10-25T01:00:00+01:00',
      '2026-10-25T01:30:00+01:00',
      '2026-10-25T01:00:00Z',
      '2026-10-25T01:30:00Z',
    ],
  );
  const { fetchFn } = makeFetch({ pages: [readings] });
  const { store, calls } = makeStore({ latest: '2026-10-24T22:00:00+00:00' });
  const r = await syncMeter(
    { fetch: fetchFn, store, now: () => new Date('2026-10-26T06:00:00Z') },
    {
      userId: 'u1',
      mpan: MPAN,
      serial: SERIAL,
      authHeader: AUTH,
    },
  );
  assertEquals(r.footprints_written, 50);
  assertEquals(new Set(calls.footprint.flat().map((f) => f.interval_start)).size, 50);
});

Deno.test('syncMeter: follows Octopus pagination', async () => {
  const t = Date.UTC(2026, 9, 20, 0, 0);
  const { fetchFn, urls, authHeaders } = makeFetch({
    pages: [octopusReadings(t, t + 2 * HH), octopusReadings(t + 2 * HH, t + 5 * HH)],
  });
  const { store } = makeStore({ latest: '2026-10-20T00:00:00+00:00' });
  const r = await syncMeter(
    { fetch: fetchFn, store, now: () => new Date('2026-10-21T00:00:00Z') },
    {
      userId: 'u1',
      mpan: MPAN,
      serial: SERIAL,
      authHeader: AUTH,
    },
  );
  assertEquals(r.readings_fetched, 5);
  assertEquals(urls.filter((u) => u.includes('api.octopus.energy')).length, 2);
  assertEquals(authHeaders, [AUTH, AUTH]);
});

Deno.test(
  'fetchOctopusConsumption refuses a next link off api.octopus.energy (key would leak)',
  async () => {
    const t = Date.UTC(2026, 9, 20);
    const { fetchFn, urls } = makeFetch({
      pages: [octopusReadings(t, t + HH), octopusReadings(t + HH, t + 2 * HH)],
      nextUrlOverride: 'https://evil.example/steal',
    });
    const r = await fetchOctopusConsumption(fetchFn, {
      mpan: MPAN,
      serial: SERIAL,
      authHeader: AUTH,
      from: new Date(t),
      to: new Date(t + DAY),
    });
    assertEquals(r.ok, false);
    assertEquals(r.error, 'unexpected_next_url');
    assertEquals(
      urls.some((u) => u.includes('evil')),
      false,
    );
  },
);

Deno.test(
  'syncMeter: Octopus 401 is an error with the status, and last_sync_at is not touched',
  async () => {
    const { fetchFn } = makeFetch({ octopusStatus: 401 });
    const { store, calls } = makeStore();
    const r = await syncMeter(
      { fetch: fetchFn, store },
      {
        userId: 'u1',
        mpan: MPAN,
        serial: SERIAL,
        authHeader: AUTH,
      },
    );
    assertEquals(r.ok, false);
    assertEquals(r.http_status, 401);
    assertEquals(r.error, 'octopus_http_401');
    assertEquals(calls.marked.length, 0);
    assertEquals(calls.consumption.length, 0);
  },
);

Deno.test(
  'syncMeter: a failed consumption upsert is an error and blocks last_sync_at',
  async () => {
    const t = Date.UTC(2026, 9, 1);
    const { fetchFn } = makeFetch({ pages: [octopusReadings(t, t + 1500 * HH)] }); // 2 chunks
    const { store, calls } = makeStore({ consumptionErrorOnCall: 2 });
    const r = await syncMeter(
      { fetch: fetchFn, store, now: () => new Date(t + 1500 * HH) },
      {
        userId: 'u1',
        mpan: MPAN,
        serial: SERIAL,
        authHeader: AUTH,
      },
    );
    assertEquals(r.ok, false);
    assertEquals(r.readings_stored, 1000);
    assert(r.error?.startsWith('consumption_upsert'));
    assertEquals(calls.marked.length, 0);
  },
);

Deno.test(
  'syncMeter: a failed footprint upsert is reported and counted, readings still synced',
  async () => {
    const t = Date.UTC(2026, 9, 20);
    const { fetchFn } = makeFetch({ pages: [octopusReadings(t, t + 4 * HH)] });
    const { store } = makeStore({ footprintError: true, latest: '2026-10-20T00:00:00+00:00' });
    const r = await syncMeter(
      { fetch: fetchFn, store, now: () => new Date(t + DAY) },
      {
        userId: 'u1',
        mpan: MPAN,
        serial: SERIAL,
        authHeader: AUTH,
      },
    );
    assertEquals(r.ok, true);
    assertEquals(r.footprint_ok, false);
    assertEquals(r.footprints_written, 0);
    assert(r.footprint_error?.startsWith('footprint_upsert'));
    const s = summarise([r]);
    assertEquals(s.footprint_failures, 1);
    assertEquals(s.errors, 1);
    assertEquals(s.success, false);
  },
);

Deno.test('syncMeter: NESO 503 leaves readings synced, footprint marked failed', async () => {
  const t = Date.UTC(2026, 9, 20);
  const { fetchFn } = makeFetch({ pages: [octopusReadings(t, t + 4 * HH)], nesoStatus: 503 });
  const { store, calls } = makeStore({ latest: '2026-10-20T00:00:00+00:00' });
  const r = await syncMeter(
    { fetch: fetchFn, store, now: () => new Date(t + DAY) },
    {
      userId: 'u1',
      mpan: MPAN,
      serial: SERIAL,
      authHeader: AUTH,
    },
  );
  assertEquals(r.ok, true);
  assertEquals(r.footprint_ok, false);
  assertEquals(calls.footprint.length, 0);
  assert(r.footprint_error?.startsWith('neso_failed_windows'));
  assertEquals(calls.marked.length, 1);
});

Deno.test('syncMeter: last_sync update error is surfaced', async () => {
  const { fetchFn } = makeFetch({ pages: [[]] });
  const { store } = makeStore({ markError: true });
  const r = await syncMeter(
    { fetch: fetchFn, store },
    { userId: 'u1', mpan: MPAN, serial: SERIAL, authHeader: AUTH },
  );
  assertEquals(r.ok, false);
  assert(r.error?.startsWith('last_sync_update'));
});

Deno.test('credentials unavailable counts as an error, never a success', () => {
  const s = summarise([
    credentialsUnavailableResult(MPAN, 'credentials_unavailable'),
    credentialsUnavailableResult('1400000000001', 'no_credentials'),
  ]);
  assertEquals(s.success, false);
  assertEquals(s.meters_ok, 0);
  assertEquals(s.meters_failed, 2);
  assertEquals(s.errors, 2);
});

Deno.test(
  'computeSyncFrom: since the newest stored reading minus 2 days, capped at 30 days',
  () => {
    const now = new Date('2026-10-23T09:00:00Z');
    assertEquals(
      computeSyncFrom(now, '2026-10-22T08:30:00+00:00').toISOString(),
      '2026-10-20T08:30:00.000Z',
    );
    // Octopus +01:00 spelling of the same newest reading gives the same start.
    assertEquals(
      computeSyncFrom(now, '2026-10-22T09:30:00+01:00').toISOString(),
      '2026-10-20T08:30:00.000Z',
    );
    // Nothing stored: the full cap.
    assertEquals(
      computeSyncFrom(now, null).getTime(),
      now.getTime() - SYNC_LOOKBACK_CAP_DAYS * DAY,
    );
    // Stored long ago: still the cap, not months of data.
    assertEquals(
      computeSyncFrom(now, '2026-01-01T00:00:00+00:00').getTime(),
      now.getTime() - 30 * DAY,
    );
    // The app asks for 30 days on link: that widens the window, within the cap.
    assertEquals(
      computeSyncFrom(now, '2026-10-22T08:30:00+00:00', 30).getTime(),
      now.getTime() - 30 * DAY,
    );
    assertEquals(computeSyncFrom(now, null, 365).getTime(), now.getTime() - 30 * DAY);
  },
);

Deno.test('syncMeter asks Octopus for everything since the last stored reading', async () => {
  const { fetchFn, urls } = makeFetch({ pages: [[]] });
  const { store } = makeStore({ latest: '2026-10-10T00:00:00+00:00' });
  await syncMeter(
    { fetch: fetchFn, store, now: () => new Date('2026-10-23T09:00:00Z') },
    {
      userId: 'u1',
      mpan: MPAN,
      serial: SERIAL,
      authHeader: AUTH,
    },
  );
  const u = new URL(urls[0]);
  assertEquals(u.searchParams.get('period_from'), '2026-10-08T00:00:00.000Z');
  assertEquals(u.searchParams.get('period_to'), '2026-10-23T09:00:00.000Z');
});

Deno.test(
  'nesoWindows: 30 days split into <=7-day windows (NESO allows 14), padded half an hour',
  () => {
    const from = new Date('2026-09-23T09:00:00Z');
    const to = new Date('2026-10-23T09:00:00Z');
    const w = nesoWindows(from, to);
    assertEquals(w.length, 5);
    for (const x of w) assert(x.to.getTime() - x.from.getTime() <= 7 * DAY + 2 * HH);
    assertEquals(w[0].from.toISOString(), '2026-09-23T08:30:00.000Z');
    assertEquals(w[4].to.toISOString(), '2026-10-23T09:30:00.000Z');
  },
);

Deno.test('calculateMeterFootprint: DB "+00:00" rows match NESO "Z" half-hours', async () => {
  const recent = [
    {
      interval_start: '2026-07-30T22:30:00+00:00',
      interval_end: '2026-07-30T23:00:00+00:00',
      consumption_kwh: 0.25,
    },
    {
      interval_start: '2026-07-30T22:00:00+00:00',
      interval_end: '2026-07-30T22:30:00+00:00',
      consumption_kwh: 0.5,
    },
  ];
  const { fetchFn, urls } = makeFetch();
  const { store, calls } = makeStore({ recent });
  const r = await calculateMeterFootprint({ fetch: fetchFn, store }, '2000000000000'); // region 11
  assertEquals(r.ok, true);
  assertEquals(r.readings, 2);
  assertEquals(r.footprints_written, 2);
  assertEquals(
    calls.footprint
      .flat()
      .map((f) => f.interval_start)
      .sort(),
    ['2026-07-30T22:00:00.000Z', '2026-07-30T22:30:00.000Z'],
  );
  assert(urls[0].endsWith('/regionid/11'));
});

Deno.test('calculateMeterFootprint: footprint write error is reported, not swallowed', async () => {
  const recent = [
    {
      interval_start: '2026-07-30T22:30:00+00:00',
      interval_end: '2026-07-30T23:00:00+00:00',
      consumption_kwh: 0.25,
    },
  ];
  const { fetchFn } = makeFetch();
  const { store } = makeStore({ recent, footprintError: true });
  const r = await calculateMeterFootprint({ fetch: fetchFn, store }, MPAN);
  assertEquals(r.ok, false);
  assertEquals(r.footprints_written, 0);
  assertEquals(summarise([r]).errors, 1);
});

// BH-127: Octopus says 200 but sends nothing new while our newest reading is old.
Deno.test(
  'syncMeter: 200 with no readings and newest stored >48h old is no_new_readings',
  async () => {
    const now = Date.UTC(2026, 9, 29, 6);
    const { fetchFn } = makeFetch({ pages: [[]] });
    const { store, calls } = makeStore({ latest: '2026-07-30T22:30:00+00:00' });
    const r = await syncMeter(
      { fetch: fetchFn, store, now: () => new Date(now) },
      { userId: 'u1', mpan: MPAN, serial: SERIAL, authHeader: AUTH },
    );
    assertEquals(r.ok, false);
    assertEquals(r.http_status, 200);
    assertEquals(r.error, 'no_new_readings');
    assertEquals(calls.marked.length, 0);
    assertEquals(summarise([r]).success, false);
  },
);

Deno.test(
  'syncMeter: only overlap re-reads (nothing newer) while stale is no_new_readings',
  async () => {
    const latest = Date.UTC(2026, 7, 1, 0, 0);
    const now = latest + 5 * DAY;
    const { fetchFn } = makeFetch({
      pages: [octopusReadings(latest - 2 * DAY, latest + HH)],
    });
    const { store, calls } = makeStore({
      latest: new Date(latest).toISOString(),
    });
    const r = await syncMeter(
      { fetch: fetchFn, store, now: () => new Date(now) },
      { userId: 'u1', mpan: MPAN, serial: SERIAL, authHeader: AUTH },
    );
    assertEquals(r.error, 'no_new_readings');
    assert(r.readings_stored > 0);
    assertEquals(calls.marked.length, 0);
  },
);

Deno.test(
  'syncMeter: no readings but newest stored is recent (Octopus lag) still succeeds',
  async () => {
    const now = Date.UTC(2026, 9, 29, 6);
    const { fetchFn } = makeFetch({ pages: [[]] });
    const { store, calls } = makeStore({
      latest: new Date(now - 30 * HH).toISOString(),
    });
    const r = await syncMeter(
      { fetch: fetchFn, store, now: () => new Date(now) },
      { userId: 'u1', mpan: MPAN, serial: SERIAL, authHeader: AUTH },
    );
    assertEquals(r.ok, true);
    assertEquals(calls.marked.length, 1);
  },
);

Deno.test('syncMeter: a brand-new meter with no readings at all is not a stall', async () => {
  const { fetchFn } = makeFetch({ pages: [[]] });
  const { store } = makeStore();
  const r = await syncMeter(
    { fetch: fetchFn, store, now: () => new Date(Date.UTC(2026, 9, 29)) },
    { userId: 'u1', mpan: MPAN, serial: SERIAL, authHeader: AUTH },
  );
  assertEquals(r.ok, true);
});

Deno.test('syncMeter: stale meter that gets newer readings recovers and marks synced', async () => {
  const latest = Date.UTC(2026, 7, 1);
  const now = latest + 5 * DAY;
  const { fetchFn } = makeFetch({
    pages: [octopusReadings(latest - 2 * DAY, now - DAY)],
  });
  const { store, calls } = makeStore({
    latest: new Date(latest).toISOString(),
  });
  const r = await syncMeter(
    { fetch: fetchFn, store, now: () => new Date(now) },
    { userId: 'u1', mpan: MPAN, serial: SERIAL, authHeader: AUTH },
  );
  assertEquals(r.ok, true);
  assertEquals(calls.marked.length, 1);
});
