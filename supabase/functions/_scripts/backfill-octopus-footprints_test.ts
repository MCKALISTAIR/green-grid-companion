import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1';
import {
  BACKFILL_WINDOW_MS,
  backfillWindows,
  formatReport,
  makePoliteNesoFetch,
  parseArgs,
  runBackfill,
  supabaseBackfillDb,
} from './backfill-octopus-footprints.ts';
import { fakeIntensity, makeFetch, octopusStamp } from '../_shared/octopus_test_harness.ts';
import { HALF_HOUR_MS, halfHourKey } from '../_shared/half-hour.ts';
import type { FetchLike } from '../_shared/octopus-sync.ts';
import { consumptionRows, dbStamp, fakeClock, makeFakeClient } from './backfill_test_harness.ts';

// All NESO traffic is mocked (makeFetch); there is no Octopus or Supabase access here.
const DAY = 86_400_000;
const M046 = '1300000000046'; // region 6 (prefix 13)
const M638 = '1300000000638';
const CLOCK_CHANGE = Date.UTC(2026, 9, 25, 1, 0); // 02:00 BST -> 01:00 GMT

function setup(tables: Record<string, Array<Record<string, unknown>>>, nesoFetch?: FetchLike) {
  const fake = makeFakeClient(tables);
  const clock = fakeClock();
  const neso = nesoFetch ?? makeFetch().fetchFn;
  const nesoUrls: string[] = [];
  const polite = makePoliteNesoFetch((u, i) => (nesoUrls.push(u), neso(u, i)), {
    now: clock.now,
    sleep: clock.sleep,
  });
  return { fake, clock, polite, nesoUrls };
}

const run = (s: ReturnType<typeof setup>, apply: boolean, extra: Record<string, unknown> = {}) =>
  runBackfill(
    {
      fetch: s.polite.fetch,
      stats: s.polite.stats,
      db: supabaseBackfillDb(s.fake.client, { allowWrites: apply }),
    },
    { apply, ...extra },
  );

Deno.test('parseArgs: dry run is the default; writing needs --apply', () => {
  assertEquals(parseArgs([]).apply, false);
  assertEquals(parseArgs(['--meter', '046']).apply, false);
  assertEquals(parseArgs(['--apply']).apply, true);
  let threw = false;
  try {
    parseArgs(['--aply']);
  } catch {
    threw = true;
  }
  assert(threw, 'typos must not silently fall back to anything');
});

Deno.test('windowing: 14-day UTC windows across the 25 Oct 2026 BST->GMT change', () => {
  // Octopus spelling (+01:00 before, Z after) mixed with DB spelling, shuffled.
  const from = Date.UTC(2026, 9, 24, 0, 0);
  const to = Date.UTC(2026, 9, 26, 12, 0);
  const readings = [];
  for (let t = from; t < to; t += HALF_HOUR_MS) {
    const odd = (t / HALF_HOUR_MS) % 2 === 1;
    readings.push({
      interval_start: odd ? octopusStamp(t) : dbStamp(t),
      interval_end: odd ? octopusStamp(t + HALF_HOUR_MS) : dbStamp(t + HALF_HOUR_MS),
      consumption_kwh: '0.2500',
    });
  }
  readings.reverse();
  // Grid boundary placed exactly on the clock-change instant.
  const { windows, invalid } = backfillWindows(readings, BACKFILL_WINDOW_MS, CLOCK_CHANGE);
  assertEquals(invalid, 0);
  assertEquals(windows.length, 2);
  assertEquals(windows[0].to, '2026-10-25T01:00:00.000Z');
  assertEquals(windows[1].from, '2026-10-25T01:00:00.000Z');
  assertEquals(new Date(windows[1].to).getTime() - new Date(windows[1].from).getTime(), 14 * DAY);
  // Every reading exactly once, oldest first, no key twice.
  const keys = windows.flatMap((w) => w.readings.map((r) => halfHourKey(r.interval_start)!));
  assertEquals(keys.length, readings.length);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(
    keys,
    [...keys].sort((a, b) => a - b),
  );
  // The repeated local 01:00 and 01:30 (BST then GMT) are four distinct UTC half-hours,
  // whichever spelling the row arrived in.
  const londonWall = (k: number) =>
    new Date(k * HALF_HOUR_MS).toLocaleString('en-GB', { timeZone: 'Europe/London' });
  const repeated = keys.filter((k) => /^25\/10\/2026, 01:[03]0/.test(londonWall(k)));
  assertEquals(
    repeated.map((k) => new Date(k * HALF_HOUR_MS).toISOString()),
    [
      '2026-10-25T00:00:00.000Z',
      '2026-10-25T00:30:00.000Z',
      '2026-10-25T01:00:00.000Z',
      '2026-10-25T01:30:00.000Z',
    ],
  );
  // Default epoch grid: same total, windows exactly 14 days.
  const grid = backfillWindows(readings).windows;
  assertEquals(
    grid.reduce((n, w) => n + w.readings.length, 0),
    readings.length,
  );
  for (const w of grid) assertEquals(Date.parse(w.to) - Date.parse(w.from), 14 * DAY);
});

Deno.test(
  'dry run over the clock change: every reading matched once, 50 half-hours on 25 Oct',
  async () => {
    // 18 Oct 00:00 BST .. 1 Nov 00:00 GMT, DB spelling.
    const from = Date.UTC(2026, 9, 17, 23, 0);
    const to = Date.UTC(2026, 10, 1, 0, 0);
    const s = setup({
      octopus_meters: [{ mpan: M046 }],
      octopus_consumption: consumptionRows(M046, from, to),
      carbon_footprint: [],
    });
    const r = await run(s, false, { originMs: CLOCK_CHANGE });
    const m = r.meters[0];
    assertEquals(m.meter, '…046');
    assertEquals(m.readings, (to - from) / HALF_HOUR_MS);
    assertEquals(m.footprints_computable, m.readings);
    assertEquals(m.new_rows, m.readings);
    assertEquals(m.readings_skipped_missing_neso, 0);
    assertEquals(m.backfill_windows, 2);
    assertEquals(m.first_reading, '2026-10-17T23:00:00.000Z');
    assertEquals(m.last_reading, '2026-10-31T23:30:00.000Z');
    // NESO is asked in UTC "Z" spelling, each request within NESO's 14-day limit.
    for (const u of s.nesoUrls) {
      const [, a, b] = /intensity\/([^/]+)\/([^/]+)/.exec(u)!;
      assert(a.endsWith('Z') && b.endsWith('Z'));
      assert(Date.parse(b) - Date.parse(a) <= 14 * DAY, u);
    }
    // London calendar day 25 Oct has 50 half-hours (25 hours); all were computable.
    const dayKeys = consumptionRows(M046, from, to)
      .map((x) => halfHourKey(x.interval_start as string)!)
      .filter((k) => {
        const d = new Date(k * HALF_HOUR_MS).toLocaleDateString('en-GB', {
          timeZone: 'Europe/London',
        });
        return d === '25/10/2026';
      });
    assertEquals(dayKeys.length, 50);
    assertEquals(m.errors, []);
  },
);

Deno.test('dry run writes nothing and only reads the three Octopus tables', async () => {
  const s = setup({
    octopus_meters: [{ mpan: M046 }, { mpan: M638 }],
    octopus_consumption: [
      ...consumptionRows(M046, Date.UTC(2026, 6, 1), Date.UTC(2026, 6, 20)),
      ...consumptionRows(M638, Date.UTC(2026, 6, 1), Date.UTC(2026, 6, 20)),
    ],
    carbon_footprint: [],
  });
  const before = JSON.stringify(s.fake.tables);
  const r = await run(s, false);
  assertEquals(r.mode, 'dry-run');
  assert(r.totals.new_rows > 0);
  assertEquals(s.fake.upserts.length, 0);
  assert(
    s.fake.ops.every((o) => o.op === 'select'),
    JSON.stringify(s.fake.ops),
  );
  assertEquals([...new Set(s.fake.ops.map((o) => o.table))].sort(), [
    'carbon_footprint',
    'octopus_consumption',
    'octopus_meters',
  ]);
  assertEquals(JSON.stringify(s.fake.tables), before);
  assert(formatReport(r).startsWith('DRY RUN: nothing was written.'));
});

Deno.test('dry-run adapter refuses writes even if called directly', async () => {
  const fake = makeFakeClient({});
  const db = supabaseBackfillDb(fake.client, { allowWrites: false });
  await assertRejects(() => db.upsertFootprints([]), Error, 'dry-run');
  assertEquals(fake.ops.length, 0);
});

Deno.test(
  'apply: the only write is an upsert into carbon_footprint on (mpan, interval_start)',
  async () => {
    const s = setup({
      octopus_meters: [{ mpan: M046 }],
      octopus_consumption: consumptionRows(M046, Date.UTC(2026, 6, 1), Date.UTC(2026, 6, 30)),
      carbon_footprint: [],
    });
    const r = await run(s, true);
    const writes = s.fake.ops.filter((o) => o.op !== 'select');
    assert(writes.length > 0);
    for (const w of writes) {
      assertEquals(w.op, 'upsert');
      assertEquals(w.table, 'carbon_footprint');
      assertEquals(w.onConflict, 'mpan,interval_start');
    }
    assertEquals(r.totals.rows_upserted, r.totals.footprints_computable);
    assertEquals(s.fake.tables.carbon_footprint.length, 29 * 48);
    // octopus_consumption / octopus_meters untouched.
    assertEquals(s.fake.tables.octopus_meters, [{ mpan: M046 }]);
    assertEquals(s.fake.tables.octopus_consumption.length, 29 * 48);
  },
);

Deno.test('idempotent: a second apply sends the same upserts and changes nothing', async () => {
  const tables = {
    octopus_meters: [{ mpan: M046 }, { mpan: M638 }],
    octopus_consumption: [
      ...consumptionRows(M046, Date.UTC(2026, 5, 20), Date.UTC(2026, 6, 30), 0.3333),
      ...consumptionRows(M638, Date.UTC(2026, 6, 10), Date.UTC(2026, 6, 30), 0.1234),
    ],
    carbon_footprint: [] as Array<Record<string, unknown>>,
  };
  const first = setup(tables);
  const r1 = await run(first, true);
  const snapshot = JSON.stringify(tables.carbon_footprint);
  const second = setup(tables);
  const r2 = await run(second, true);
  assertEquals(second.fake.upserts, first.fake.upserts);
  assertEquals(JSON.stringify(tables.carbon_footprint), snapshot);
  assertEquals(r1.totals.new_rows, r1.totals.footprints_computable);
  assertEquals(r2.totals.new_rows, 0);
  assertEquals(r2.totals.rows_that_would_change, 0);
  assertEquals(r2.totals.footprints_computable, r1.totals.footprints_computable);
  // And a dry run afterwards agrees.
  const third = setup(tables);
  const r3 = await run(third, false);
  assertEquals(r3.totals.new_rows, 0);
  assertEquals(r3.totals.rows_that_would_change, 0);
});

Deno.test('existing rows with different values are counted as "would change"', async () => {
  const start = Date.UTC(2026, 6, 1);
  const k = halfHourKey(start)!;
  const s = setup({
    octopus_meters: [{ mpan: M046 }],
    octopus_consumption: consumptionRows(M046, start, start + 4 * HALF_HOUR_MS, 0.5),
    carbon_footprint: [
      // same as computed
      {
        mpan: M046,
        interval_start: dbStamp(start),
        interval_end: dbStamp(start + HALF_HOUR_MS),
        consumption_kwh: 0.5,
        intensity_gco2_kwh: fakeIntensity(k),
        carbon_g: 0.5 * fakeIntensity(k),
        intensity_index: 'moderate',
      },
      // stale intensity
      {
        mpan: M046,
        interval_start: dbStamp(start + HALF_HOUR_MS),
        interval_end: dbStamp(start + 2 * HALF_HOUR_MS),
        consumption_kwh: 0.5,
        intensity_gco2_kwh: 999,
        carbon_g: 499.5,
        intensity_index: 'very high',
      },
    ],
  });
  const m = (await run(s, false)).meters[0];
  assertEquals(m.footprints_computable, 4);
  assertEquals(m.rows_unchanged, 1);
  assertEquals(m.rows_that_would_change, 1);
  assertEquals(m.new_rows, 2);
  assertEquals(m.change_samples.length, 1);
});

Deno.test(
  'NESO 429/5xx are retried with backoff (Retry-After honoured), then succeed',
  async () => {
    const base = makeFetch().fetchFn;
    let calls = 0;
    const flaky: FetchLike = (u, i) => {
      calls++;
      if (calls === 1)
        return Promise.resolve(
          new Response('{}', { status: 429, headers: { 'Retry-After': '7' } }),
        );
      if (calls === 2) return Promise.resolve(new Response('{}', { status: 503 }));
      if (calls === 3) return Promise.reject(new TypeError('connection reset'));
      return base(u, i);
    };
    const s = setup(
      {
        octopus_meters: [{ mpan: M046 }],
        octopus_consumption: consumptionRows(M046, Date.UTC(2026, 6, 1), Date.UTC(2026, 6, 3)),
        carbon_footprint: [],
      },
      flaky,
    );
    const r = await run(s, false);
    assertEquals(s.polite.stats.retries, 3);
    assert(s.clock.sleeps.includes(7000), `Retry-After ignored: ${s.clock.sleeps}`);
    assert(s.clock.sleeps.includes(4000), `no exponential backoff: ${s.clock.sleeps}`);
    assertEquals(r.meters[0].neso_windows_missing, []);
    assertEquals(r.meters[0].readings_skipped_missing_neso, 0);
    assert(r.ok);
  },
);

Deno.test(
  'NESO still failing after retries: window reported missing, its readings skipped, run not OK',
  async () => {
    const base = makeFetch().fetchFn;
    // Fail every request whose range starts in the first week of July.
    const broken: FetchLike = (u, i) =>
      /intensity\/2026-06-30T23:30Z\//.test(u)
        ? Promise.resolve(new Response('{}', { status: 500 }))
        : base(u, i);
    const s = setup(
      {
        octopus_meters: [{ mpan: M046 }],
        octopus_consumption: consumptionRows(M046, Date.UTC(2026, 6, 1), Date.UTC(2026, 6, 10)),
        carbon_footprint: [],
      },
      broken,
    );
    const r = await run(s, false);
    const m = r.meters[0];
    assertEquals(m.neso_windows_missing.length, 1);
    assertEquals(m.neso_windows_missing[0].status, 500);
    assertEquals(m.neso_windows_missing[0].from, '2026-06-30T23:30Z');
    assertEquals(s.polite.stats.retries, 5);
    assert(m.readings_skipped_missing_neso > 0);
    assertEquals(m.footprints_computable + m.readings_skipped_missing_neso, m.readings);
    assert(!r.ok);
    assert(formatReport(r).includes('NESO windows STILL MISSING'));
  },
);

Deno.test('paced: at least minIntervalMs between NESO requests', async () => {
  const s = setup({
    octopus_meters: [{ mpan: M046 }],
    octopus_consumption: consumptionRows(M046, Date.UTC(2026, 4, 1), Date.UTC(2026, 6, 1)),
    carbon_footprint: [],
  });
  await run(s, false);
  assert(s.polite.stats.requests > 4);
  assertEquals(s.clock.sleeps.length, s.polite.stats.requests - 1);
  assert(
    s.clock.sleeps.every((ms) => ms === 1000),
    String(s.clock.sleeps),
  );
});

Deno.test('never calls Octopus or any non-NESO host', async () => {
  const { fetch } = makePoliteNesoFetch(() => Promise.reject(new Error('inner must not run')));
  await assertRejects(
    () => fetch('https://api.octopus.energy/v1/electricity-meter-points/x/meters/y/consumption/'),
    Error,
    'non-NESO',
  );
});

Deno.test(
  'scale fixture: ~20.6k readings like the live meters (contiguous to 30 Jul)',
  async () => {
    // Assumes each meter's readings are contiguous and end at the 30 Jul 2026 gap.
    const end = Date.UTC(2026, 6, 30, 23, 0);
    const rows046 = consumptionRows(M046, end - 10_382 * HALF_HOUR_MS, end);
    const rows638 = consumptionRows(M638, end - 10_227 * HALF_HOUR_MS, end);
    const s = setup({
      octopus_meters: [{ mpan: M046 }, { mpan: M638 }],
      octopus_consumption: [...rows046, ...rows638],
      carbon_footprint: [],
    });
    const r = await run(s, false);
    assertEquals(r.totals.readings, 20_609);
    assertEquals(r.totals.footprints_computable, 20_609);
    for (const m of r.meters) assert(m.backfill_windows >= 16 && m.backfill_windows <= 17);
    // Same region -> the fixed UTC grid lets the second meter reuse cached NESO windows.
    assert(r.meters[1].neso_cache_hits > 0);
  },
);
