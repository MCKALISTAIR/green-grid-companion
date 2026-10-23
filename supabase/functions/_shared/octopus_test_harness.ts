/**
 * Test doubles for octopus-sync.ts (BH-91). Pure TS, no Deno or Node APIs, so
 * the Deno suite and Vitest share it. Nothing here touches the network: every
 * Octopus and NESO call is answered from memory.
 */
import type { FetchLike, OctopusStore, ConsumptionRow } from './octopus-sync.ts';
import type { FootprintRow } from './footprint-records.ts';
import { HALF_HOUR_MS, halfHourKey } from './half-hour.ts';

const londonParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** How Octopus spells an instant: UK wall clock, "Z" in GMT and "+01:00" in BST. */
export function octopusStamp(ms: number): string {
  const p = Object.fromEntries(
    londonParts.formatToParts(new Date(ms)).map((x) => [x.type, x.value]),
  );
  const hour = p.hour === '24' ? '00' : p.hour;
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +hour, +p.minute, +p.second);
  const offsetMin = Math.round((wall - ms) / 60000);
  const local = `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}`;
  if (offsetMin === 0) return `${local}Z`;
  const sign = offsetMin > 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return `${local}${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/** Octopus readings for every half-hour in [fromMs, toMs). */
export function octopusReadings(fromMs: number, toMs: number, kwh = 0.5) {
  const out: Array<{ consumption: number; interval_start: string; interval_end: string }> = [];
  for (let t = fromMs; t < toMs; t += HALF_HOUR_MS) {
    out.push({
      consumption: kwh,
      interval_start: octopusStamp(t),
      interval_end: octopusStamp(t + HALF_HOUR_MS),
    });
  }
  return out;
}

/** Deterministic made-up intensity for a half-hour key. */
export const fakeIntensity = (key: number) => 100 + (key % 7);

export interface FakeStoreOptions {
  latest?: string | null;
  latestError?: boolean;
  consumptionErrorOnCall?: number; // 1-based call that fails
  footprintError?: boolean;
  markError?: boolean;
  /** Rows returned by recentConsumption (DB spelling). */
  recent?: Array<{ interval_start: string; interval_end: string; consumption_kwh: number }>;
}

export function makeStore(o: FakeStoreOptions = {}) {
  const calls = {
    consumption: [] as ConsumptionRow[][],
    footprint: [] as FootprintRow[][],
    marked: [] as Array<{ userId: string; mpan: string; at: string }>,
  };
  const err = (m: string) => ({ message: m });
  const store: OctopusStore = {
    latestReadingStart: () =>
      Promise.resolve(
        o.latestError
          ? { value: null, error: err('latest boom') }
          : { value: o.latest ?? null, error: null },
      ),
    upsertConsumption: (rows) => {
      calls.consumption.push(rows);
      const fail = o.consumptionErrorOnCall === calls.consumption.length;
      return Promise.resolve({ error: fail ? err('consumption boom') : null });
    },
    upsertFootprint: (rows) => {
      calls.footprint.push(rows);
      return Promise.resolve({ error: o.footprintError ? err('footprint boom') : null });
    },
    recentConsumption: () => Promise.resolve({ data: o.recent ?? [], error: null }),
    markSynced: (userId, mpan, at) => {
      calls.marked.push({ userId, mpan, at });
      return Promise.resolve({ error: o.markError ? err('mark boom') : null });
    },
  };
  return { store, calls };
}

export interface FakeFetchOptions {
  /** Octopus pages, in order. Each page's `next` is filled in automatically. */
  pages?: Array<Array<{ consumption: number; interval_start: string; interval_end: string }>>;
  octopusStatus?: number;
  nesoStatus?: number;
  nextUrlOverride?: string;
}

/** Answers Octopus consumption + NESO /intensity/{from}/{to} from memory, recording every URL. */
export function makeFetch(o: FakeFetchOptions = {}) {
  const urls: string[] = [];
  const authHeaders: Array<string | null> = [];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const fetchFn: FetchLike = (input, init) => {
    urls.push(input);
    if (input.startsWith('https://api.octopus.energy/')) {
      authHeaders.push(new Headers(init?.headers).get('Authorization'));
      if (o.octopusStatus && o.octopusStatus !== 200)
        return Promise.resolve(json({ detail: 'x' }, o.octopusStatus));
      const pages = o.pages ?? [[]];
      const m = /[?&]page=(\d+)/.exec(input);
      const page = m ? Number(m[1]) : 1;
      const results = pages[page - 1] ?? [];
      const base = input.replace(/[?&]page=\d+/, '');
      const next =
        page < pages.length
          ? (o.nextUrlOverride ?? `${base}${base.includes('?') ? '&' : '?'}page=${page + 1}`)
          : null;
      return Promise.resolve(json({ count: results.length, next, previous: null, results }));
    }
    if (input.startsWith('https://api.carbonintensity.org.uk/')) {
      if (o.nesoStatus && o.nesoStatus !== 200)
        return Promise.resolve(json({ error: {} }, o.nesoStatus));
      const m = /intensity\/([^/]+)\/([^/]+)/.exec(input)!;
      const fromKey = halfHourKey(m[1])!;
      const toKey = halfHourKey(m[2])!;
      const data = [];
      // NESO spelling: UTC, no seconds.
      for (let k = fromKey; k < toKey; k++) {
        const iso = new Date(k * HALF_HOUR_MS).toISOString().slice(0, 16) + 'Z';
        const end = new Date((k + 1) * HALF_HOUR_MS).toISOString().slice(0, 16) + 'Z';
        data.push({
          from: iso,
          to: end,
          intensity: { forecast: fakeIntensity(k), actual: null, index: 'moderate' },
        });
      }
      const regional = input.includes('/regional/');
      return Promise.resolve(json(regional ? { data: { regionid: 13, data } } : { data }));
    }
    return Promise.reject(new Error(`unexpected fetch ${input}`));
  };
  return { fetchFn, urls, authHeaders };
}
