/**
 * One-off carbon_footprint backfill for every stored Octopus reading (BH-91 follow-up).
 *
 * NEEDS-ALISTAIR: --apply writes to the live carbon_footprint table.
 *
 * Why this exists: before #180 footprints never matched NESO half-hours, and the
 * regular calculate path only recomputes the newest CALC_READING_LIMIT (500)
 * readings per meter. Older stored readings therefore have no footprint row.
 *
 * What it does, per meter, oldest to newest:
 *   1. reads ALL octopus_consumption rows (keyset pages, read-only);
 *   2. reads the existing carbon_footprint rows (read-only) to diff against;
 *   3. groups the readings into 14-day UTC windows and hands each window to the
 *      shared calculateMeterFootprint (same NESO URL, half-hour matching and
 *      maths as the live octopus-energy function: nothing is re-implemented);
 *   4. dry run (DEFAULT): captures the rows calculateMeterFootprint would upsert
 *      and writes nothing. --apply: upserts them into carbon_footprint ON
 *      CONFLICT (mpan, interval_start), the table's UNIQUE key.
 *
 * It never deletes, never writes octopus_consumption / octopus_meters
 * (last_sync_at) or any other table, and never calls Octopus: the only network
 * host it will fetch is the public NESO Carbon Intensity API.
 *
 * Lives under supabase/functions/_scripts: the Supabase CLI skips "_" folders,
 * so this is never deployed as an edge function.
 *
 * Usage (from supabase/functions):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     deno run --allow-env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY \
 *       --allow-net=<project>.supabase.co,api.carbonintensity.org.uk,esm.sh \
 *       _scripts/backfill-octopus-footprints.ts [--apply] [--meter 046] [--json]
 */
import {
  calculateMeterFootprint,
  type FetchLike,
  type OctopusStore,
} from '../_shared/octopus-sync.ts';
import type { FootprintRow } from '../_shared/footprint-records.ts';
import { HALF_HOUR_MS, halfHourKey, halfHourKeyToIso } from '../_shared/half-hour.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Readings are processed in 14-day UTC windows (NESO's maximum range per request). */
export const BACKFILL_WINDOW_DAYS = 14;
export const BACKFILL_WINDOW_MS = BACKFILL_WINDOW_DAYS * DAY_MS;
/** PostgREST page size for the read-only scans. */
export const READ_PAGE_SIZE = 1000;
/** The only host the backfill may fetch. Octopus is never called. */
export const NESO_ORIGIN = 'https://api.carbonintensity.org.uk/';
/** The one table this script may write, and its UNIQUE(mpan, interval_start) key. */
export const FOOTPRINT_TABLE = 'carbon_footprint';
export const FOOTPRINT_CONFLICT_TARGET = 'mpan,interval_start';

type DbError = { message?: string } | null | undefined;

export interface StoredReading {
  interval_start: string;
  interval_end: string;
  consumption_kwh: number | string;
}

export interface ExistingFootprint {
  interval_start: string;
  interval_end: string;
  consumption_kwh: number | string;
  intensity_gco2_kwh: number | string;
  carbon_g: number | string;
  intensity_index: string;
}

/** Every DB operation the backfill can perform. Only upsertFootprints writes. */
export interface BackfillDb {
  listMeters(): Promise<string[]>;
  readings(mpan: string): Promise<StoredReading[]>;
  footprints(mpan: string): Promise<ExistingFootprint[]>;
  upsertFootprints(rows: FootprintRow[]): Promise<{ error: DbError }>;
}

/** "…046": last three digits only, never the full MPAN. */
export function maskMpan3(mpan: string): string {
  return mpan ? `…${mpan.slice(-3)}` : '…';
}

function errText(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e)
    return String((e as { message: unknown }).message);
  return String(e);
}

// ---------------------------------------------------------------------------
// Windowing

export interface ReadingWindow {
  /** Inclusive UTC start / exclusive UTC end of the 14-day window. */
  from: string;
  to: string;
  readings: Array<{ interval_start: string; interval_end: string; consumption_kwh: number }>;
}

/**
 * Sort readings by instant (oldest first) and bucket them on a fixed UTC grid
 * of `windowMs` starting at `originMs`. The grid is in epoch half-hours, not
 * local days, so the 25 Oct 2026 BST→GMT change (two 01:00–02:00 local hours)
 * needs no special case. A fixed grid also makes NESO URLs identical across
 * meters in the same region, so the paced fetcher's cache can reuse them.
 * Readings whose start can't be read as an instant are returned in `invalid`.
 */
export function backfillWindows(
  readings: StoredReading[],
  windowMs = BACKFILL_WINDOW_MS,
  originMs = 0,
): { windows: ReadingWindow[]; invalid: number } {
  let invalid = 0;
  const keyed: Array<{ key: number; r: StoredReading }> = [];
  for (const r of readings) {
    const key = halfHourKey(r.interval_start);
    if (key === null) invalid++;
    else keyed.push({ key, r });
  }
  keyed.sort((a, b) => a.key - b.key);
  const byWindow = new Map<number, ReadingWindow>();
  const order: number[] = [];
  for (const { key, r } of keyed) {
    const ms = key * HALF_HOUR_MS;
    const idx = Math.floor((ms - originMs) / windowMs);
    let w = byWindow.get(idx);
    if (!w) {
      const start = originMs + idx * windowMs;
      w = {
        from: new Date(start).toISOString(),
        to: new Date(start + windowMs).toISOString(),
        readings: [],
      };
      byWindow.set(idx, w);
      order.push(idx);
    }
    w.readings.push({
      interval_start: r.interval_start,
      interval_end: r.interval_end,
      consumption_kwh: Number(r.consumption_kwh),
    });
  }
  return { windows: order.map((i) => byWindow.get(i)!), invalid };
}

// ---------------------------------------------------------------------------
// Polite NESO fetcher

export interface PaceOptions {
  /** Minimum gap between NESO requests. */
  minIntervalMs: number;
  /** Retries after the first attempt, on 429 / 5xx / network errors only. */
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

export const DEFAULT_PACE: PaceOptions = {
  minIntervalMs: 1000,
  maxRetries: 5,
  baseBackoffMs: 2000,
  maxBackoffMs: 60_000,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
};

export interface FetchStats {
  /** HTTP attempts actually sent (including retries). */
  requests: number;
  retries: number;
  cacheHits: number;
  /** Distinct NESO URLs answered 200. */
  okUrls: string[];
  /** URLs still failing after every retry. */
  failed: Array<{ url: string; status: number }>;
}

function retryAfterMs(res: Response): number | null {
  const v = res.headers.get('Retry-After');
  if (!v) return null;
  const s = Number(v);
  if (Number.isFinite(s) && s >= 0) return s * 1000;
  const at = Date.parse(v);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : null;
}

/**
 * Wraps fetch for the shared pipeline: NESO only (anything else throws, so a
 * stray Octopus call is impossible), one request per minIntervalMs, exponential
 * backoff (honouring Retry-After) on 429 / 5xx / network errors, and an
 * in-memory cache of 200 bodies keyed by URL.
 */
export function makePoliteNesoFetch(
  inner: FetchLike,
  pace: Partial<PaceOptions> = {},
): { fetch: FetchLike; stats: FetchStats } {
  const p = { ...DEFAULT_PACE, ...pace };
  const stats: FetchStats = { requests: 0, retries: 0, cacheHits: 0, okUrls: [], failed: [] };
  const cache = new Map<string, string>();
  let last = Number.NEGATIVE_INFINITY;
  const ok = (text: string) =>
    new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } });

  const fetchFn: FetchLike = async (url, init) => {
    if (!url.startsWith(NESO_ORIGIN)) {
      throw new Error('backfill: refusing to fetch a non-NESO URL');
    }
    const hit = cache.get(url);
    if (hit !== undefined) {
      stats.cacheHits++;
      return ok(hit);
    }
    for (let attempt = 0; ; attempt++) {
      const wait = last + p.minIntervalMs - p.now();
      if (wait > 0) await p.sleep(wait);
      last = p.now();
      stats.requests++;
      let res: Response | null = null;
      let status = 0;
      try {
        res = await inner(url, init);
        status = res.status;
      } catch {
        res = null;
      }
      if (res && res.ok) {
        const text = await res.text();
        cache.set(url, text);
        stats.okUrls.push(url);
        return ok(text);
      }
      const retryable = status === 0 || status === 429 || status >= 500;
      if (retryable && attempt < p.maxRetries) {
        const backoff = Math.min(p.maxBackoffMs, p.baseBackoffMs * 2 ** attempt);
        const delay = res ? (retryAfterMs(res) ?? backoff) : backoff;
        await res?.body?.cancel();
        stats.retries++;
        await p.sleep(Math.min(p.maxBackoffMs, delay));
        continue;
      }
      stats.failed.push({ url, status });
      if (!res) throw new Error(`network error after ${attempt + 1} attempts`);
      return res;
    }
  };
  return { fetch: fetchFn, stats };
}

// ---------------------------------------------------------------------------
// Backfill

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

/** Same values once stored (consumption/carbon numeric(…,4), intensity integer)? */
export function sameFootprint(a: ExistingFootprint, b: FootprintRow): boolean {
  return (
    halfHourKey(a.interval_end) === halfHourKey(b.interval_end) &&
    round4(Number(a.consumption_kwh)) === round4(b.consumption_kwh) &&
    Number(a.intensity_gco2_kwh) === Math.round(b.intensity_gco2_kwh) &&
    round4(Number(a.carbon_g)) === round4(b.carbon_g) &&
    a.intensity_index === b.intensity_index
  );
}

export interface WindowReport {
  from: string;
  to: string;
  readings: number;
  computable: number;
  neso_requests: number;
  error?: string;
}

export interface MeterReport {
  meter: string; // masked, last 3 digits
  readings: number;
  existing_footprints: number;
  footprints_computable: number;
  new_rows: number;
  rows_that_would_change: number;
  rows_unchanged: number;
  readings_skipped_missing_neso: number;
  readings_invalid_time: number;
  first_reading: string | null;
  last_reading: string | null;
  backfill_windows: number;
  neso_requests: number;
  neso_cache_hits: number;
  neso_windows_missing: Array<{ from: string; to: string; status: number }>;
  windows: WindowReport[];
  /** Up to 3 examples of changed rows, for review. */
  change_samples: Array<{ interval_start: string; before: string; after: string }>;
  /** --apply only. */
  rows_upserted?: number;
  errors: string[];
}

export interface BackfillReport {
  mode: 'dry-run' | 'apply';
  started_at: string;
  finished_at: string;
  meters: MeterReport[];
  totals: {
    meters: number;
    readings: number;
    existing_footprints: number;
    footprints_computable: number;
    new_rows: number;
    rows_that_would_change: number;
    readings_skipped_missing_neso: number;
    backfill_windows: number;
    neso_requests: number;
    neso_windows_missing: number;
    rows_upserted?: number;
  };
  ok: boolean;
}

function forbidden(op: string): never {
  throw new Error(`backfill: ${op} is not allowed (carbon_footprint upserts only)`);
}

function parseNesoRange(url: string): { from: string; to: string } {
  const m = /intensity\/([^/]+)\/([^/]+)/.exec(url);
  return m ? { from: m[1], to: m[2] } : { from: '?', to: '?' };
}

export async function backfillMeter(
  deps: { fetch: FetchLike; stats: FetchStats; db: BackfillDb; apply: boolean },
  mpan: string,
  windowing: { windowMs?: number; originMs?: number } = {},
): Promise<MeterReport> {
  const errors: string[] = [];
  const stored = await deps.db.readings(mpan);
  const existingRows = await deps.db.footprints(mpan);
  const existing = new Map<number, ExistingFootprint>();
  for (const f of existingRows) {
    const k = halfHourKey(f.interval_start);
    if (k !== null) existing.set(k, f);
  }
  const { windows, invalid } = backfillWindows(stored, windowing.windowMs, windowing.originMs);

  const computed = new Map<number, FootprintRow>();
  const reqBefore = deps.stats.requests;
  const hitsBefore = deps.stats.cacheHits;
  const failBefore = deps.stats.failed.length;
  let upserted = 0;
  const windowReports: WindowReport[] = [];

  for (const w of windows) {
    let windowRows = 0;
    const store: OctopusStore = {
      latestReadingStart: () => forbidden('latestReadingStart'),
      upsertConsumption: () => forbidden('octopus_consumption write'),
      markSynced: () => forbidden('octopus_meters.last_sync_at write'),
      recentConsumption: () => Promise.resolve({ data: w.readings, error: null }),
      upsertFootprint: async (rows) => {
        windowRows += rows.length;
        for (const r of rows) computed.set(halfHourKey(r.interval_start)!, r);
        if (!deps.apply) return { error: null };
        const res = await deps.db.upsertFootprints(rows);
        if (!res.error) upserted += rows.length;
        return res;
      },
    };
    const req0 = deps.stats.requests + deps.stats.cacheHits;
    const r = await calculateMeterFootprint({ fetch: deps.fetch, store }, mpan, w.readings.length);
    const wr: WindowReport = {
      from: w.from,
      to: w.to,
      readings: w.readings.length,
      computable: windowRows,
      neso_requests: deps.stats.requests + deps.stats.cacheHits - req0,
    };
    if (r.error) {
      wr.error = r.error;
      errors.push(`${w.from.slice(0, 10)}..${w.to.slice(0, 10)}: ${r.error}`);
    }
    windowReports.push(wr);
  }

  let newRows = 0;
  let changed = 0;
  let unchanged = 0;
  const samples: MeterReport['change_samples'] = [];
  for (const [k, row] of computed) {
    const old = existing.get(k);
    if (!old) newRows++;
    else if (sameFootprint(old, row)) unchanged++;
    else {
      changed++;
      if (samples.length < 3) {
        samples.push({
          interval_start: halfHourKeyToIso(k),
          before: `${Number(old.intensity_gco2_kwh)} g/kWh ${old.intensity_index}, ${Number(old.carbon_g)} g`,
          after: `${row.intensity_gco2_kwh} g/kWh ${row.intensity_index}, ${round4(row.carbon_g)} g`,
        });
      }
    }
  }
  const readingsValid = windows.reduce((n, w) => n + w.readings.length, 0);
  const first = windows[0]?.readings[0]?.interval_start;
  const lastW = windows[windows.length - 1];
  const last = lastW?.readings[lastW.readings.length - 1]?.interval_start;

  const report: MeterReport = {
    meter: maskMpan3(mpan),
    readings: stored.length,
    existing_footprints: existingRows.length,
    footprints_computable: computed.size,
    new_rows: newRows,
    rows_that_would_change: changed,
    rows_unchanged: unchanged,
    readings_skipped_missing_neso: readingsValid - computed.size,
    readings_invalid_time: invalid,
    first_reading: first ? halfHourKeyToIso(halfHourKey(first)!) : null,
    last_reading: last ? halfHourKeyToIso(halfHourKey(last)!) : null,
    backfill_windows: windows.length,
    neso_requests: deps.stats.requests - reqBefore,
    neso_cache_hits: deps.stats.cacheHits - hitsBefore,
    neso_windows_missing: deps.stats.failed
      .slice(failBefore)
      .map((f) => ({ ...parseNesoRange(f.url), status: f.status })),
    windows: windowReports,
    change_samples: samples,
    errors,
  };
  if (deps.apply) report.rows_upserted = upserted;
  return report;
}

export async function runBackfill(
  deps: { fetch: FetchLike; stats: FetchStats; db: BackfillDb; now?: () => Date },
  opts: { apply: boolean; meterSuffix?: string; windowMs?: number; originMs?: number },
): Promise<BackfillReport> {
  const now = deps.now ?? (() => new Date());
  const started = now().toISOString();
  let mpans = await deps.db.listMeters();
  if (opts.meterSuffix) mpans = mpans.filter((m) => m.endsWith(opts.meterSuffix!));
  const meters: MeterReport[] = [];
  for (const mpan of mpans) {
    meters.push(
      await backfillMeter({ ...deps, apply: opts.apply }, mpan, {
        windowMs: opts.windowMs,
        originMs: opts.originMs,
      }),
    );
  }
  const sum = (f: (m: MeterReport) => number) => meters.reduce((n, m) => n + f(m), 0);
  const totals: BackfillReport['totals'] = {
    meters: meters.length,
    readings: sum((m) => m.readings),
    existing_footprints: sum((m) => m.existing_footprints),
    footprints_computable: sum((m) => m.footprints_computable),
    new_rows: sum((m) => m.new_rows),
    rows_that_would_change: sum((m) => m.rows_that_would_change),
    readings_skipped_missing_neso: sum((m) => m.readings_skipped_missing_neso),
    backfill_windows: sum((m) => m.backfill_windows),
    neso_requests: sum((m) => m.neso_requests),
    neso_windows_missing: sum((m) => m.neso_windows_missing.length),
  };
  if (opts.apply) totals.rows_upserted = sum((m) => m.rows_upserted ?? 0);
  return {
    mode: opts.apply ? 'apply' : 'dry-run',
    started_at: started,
    finished_at: now().toISOString(),
    meters,
    totals,
    ok: meters.every((m) => m.errors.length === 0),
  };
}

export function formatReport(r: BackfillReport): string {
  const lines: string[] = [];
  lines.push(
    r.mode === 'dry-run'
      ? 'DRY RUN: nothing was written. Re-run with --apply to upsert carbon_footprint.'
      : 'APPLY: carbon_footprint rows were upserted (no deletes, no other tables).',
  );
  lines.push(`started_at ${r.started_at}  finished_at ${r.finished_at} (UTC)`);
  for (const m of r.meters) {
    lines.push('');
    lines.push(`Meter ${m.meter}`);
    lines.push(`  readings                        ${m.readings}`);
    lines.push(`  existing footprints             ${m.existing_footprints}`);
    lines.push(`  footprints computable           ${m.footprints_computable}`);
    lines.push(`  new rows                        ${m.new_rows}`);
    lines.push(`  rows that would change          ${m.rows_that_would_change}`);
    lines.push(`  rows unchanged                  ${m.rows_unchanged}`);
    lines.push(`  readings skipped (no NESO data) ${m.readings_skipped_missing_neso}`);
    if (m.readings_invalid_time)
      lines.push(`  readings with unreadable time   ${m.readings_invalid_time}`);
    lines.push(`  date range (UTC)                ${m.first_reading} .. ${m.last_reading}`);
    lines.push(`  14-day windows                  ${m.backfill_windows}`);
    lines.push(
      `  NESO requests                   ${m.neso_requests} (+${m.neso_cache_hits} from cache)`,
    );
    if (m.rows_upserted !== undefined)
      lines.push(`  rows upserted                   ${m.rows_upserted}`);
    if (m.neso_windows_missing.length) {
      lines.push(`  NESO windows STILL MISSING after retries:`);
      for (const w of m.neso_windows_missing)
        lines.push(`    ${w.from} .. ${w.to}  HTTP ${w.status || 'network error'}`);
    }
    for (const s of m.change_samples)
      lines.push(`  change e.g. ${s.interval_start}: ${s.before} -> ${s.after}`);
    for (const e of m.errors) lines.push(`  ERROR ${e}`);
  }
  const t = r.totals;
  lines.push('');
  lines.push(
    `TOTAL meters ${t.meters}, readings ${t.readings}, existing ${t.existing_footprints}, ` +
      `computable ${t.footprints_computable}, new ${t.new_rows}, would change ${t.rows_that_would_change}, ` +
      `skipped (no NESO) ${t.readings_skipped_missing_neso}, 14-day windows ${t.backfill_windows}, ` +
      `NESO requests ${t.neso_requests}, NESO windows missing ${t.neso_windows_missing}` +
      (t.rows_upserted !== undefined ? `, upserted ${t.rows_upserted}` : ''),
  );
  if (r.mode === 'apply') {
    lines.push('');
    lines.push(
      'Rollback window (rows INSERTED by this run; updated rows keep their old created_at):',
    );
    lines.push(`  created_at >= '${r.started_at}' AND created_at <= '${r.finished_at}'`);
  }
  lines.push(r.ok ? 'Result: OK' : 'Result: COMPLETED WITH ERRORS (see above)');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// supabase-js adapter (service role; reads three tables, writes one)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

async function readAll<T>(
  page: (after: string | null) => Promise<{ data: T[] | null; error: DbError }>,
  keyOf: (row: T) => string,
): Promise<T[]> {
  const out: T[] = [];
  let after: string | null = null;
  for (;;) {
    const { data, error } = await page(after);
    if (error) throw new Error(`read failed: ${errText(error)}`);
    const rows = data ?? [];
    if (rows.length === 0) return out;
    out.push(...rows);
    after = keyOf(rows[rows.length - 1]);
  }
}

export function supabaseBackfillDb(client: AnyClient, opts: { allowWrites: boolean }): BackfillDb {
  return {
    async listMeters() {
      const { data, error } = await client
        .from('octopus_meters')
        .select('mpan')
        .order('mpan', { ascending: true });
      if (error) throw new Error(`octopus_meters read failed: ${errText(error)}`);
      return [...new Set((data ?? []).map((r: { mpan: string }) => r.mpan))] as string[];
    },
    readings(mpan) {
      return readAll<StoredReading>(
        (after) => {
          let q = client
            .from('octopus_consumption')
            .select('interval_start, interval_end, consumption_kwh')
            .eq('mpan', mpan);
          if (after) q = q.gt('interval_start', after);
          return q.order('interval_start', { ascending: true }).limit(READ_PAGE_SIZE);
        },
        (r) => r.interval_start,
      );
    },
    footprints(mpan) {
      return readAll<ExistingFootprint>(
        (after) => {
          let q = client
            .from(FOOTPRINT_TABLE)
            .select(
              'interval_start, interval_end, consumption_kwh, intensity_gco2_kwh, carbon_g, intensity_index',
            )
            .eq('mpan', mpan);
          if (after) q = q.gt('interval_start', after);
          return q.order('interval_start', { ascending: true }).limit(READ_PAGE_SIZE);
        },
        (r) => r.interval_start,
      );
    },
    async upsertFootprints(rows) {
      if (!opts.allowWrites) throw new Error('backfill: write attempted in dry-run mode');
      const { error } = await client
        .from(FOOTPRINT_TABLE)
        .upsert(rows, { onConflict: FOOTPRINT_CONFLICT_TARGET });
      return { error };
    },
  };
}

// ---------------------------------------------------------------------------
// CLI

export interface CliArgs {
  apply: boolean;
  json: boolean;
  meterSuffix?: string;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { apply: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--dry-run') args.apply = false;
    else if (a === '--json') args.json = true;
    else if (a === '--meter') {
      const v = argv[++i];
      if (!v || !/^\d{3,4}$/.test(v)) throw new Error('--meter takes the last 3 or 4 MPAN digits');
      args.meterSuffix = v;
    } else throw new Error(`unknown argument ${a}`);
  }
  return args;
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const D = (globalThis as any).Deno;
  const args = parseArgs(D.args);
  const url = D.env.get('SUPABASE_URL');
  const key = D.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
    D.exit(2);
  }
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { fetch: nesoFetch, stats } = makePoliteNesoFetch((u, init) => fetch(u, init));
  const report = await runBackfill(
    { fetch: nesoFetch, stats, db: supabaseBackfillDb(client, { allowWrites: args.apply }) },
    { apply: args.apply, meterSuffix: args.meterSuffix },
  );
  console.log(args.json ? JSON.stringify(report, null, 2) : formatReport(report));
  D.exit(report.ok ? 0 : 1);
}

if (import.meta.main) {
  main().catch((e) => {
    // Error text only: never the env, the key or the client config.
    console.error(`backfill failed: ${errText(e)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Deno.exit(1);
  });
}
