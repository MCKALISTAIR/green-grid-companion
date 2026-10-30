/**
 * Octopus smart-meter sync + footprint pipeline (BH-91).
 *
 * Shared by every octopus-energy path so they can't drift apart again:
 *   - cron  ?action=sync-all-users            -> syncMeter per active meter
 *   - cron  ?action=calculate-all-footprints  -> calculateMeterFootprint per meter
 *   - app   sync-consumption / calculate-footprint / full-sync (same helpers)
 *
 * Everything that talks to the outside world is injected (fetch + a narrow DB
 * store), so the Deno and Vitest suites run it against mocks only.
 */
import { buildFootprintRows, buildIntensityMap, type FootprintRow } from './footprint-records.ts';
import type { IntensityPoint } from './intensity-point.ts';
import { HALF_HOUR_MS, halfHourKey, halfHourKeyToIso } from './half-hour.ts';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Lookback cap for a sync. 30 days = 1,440 half-hours per meter: one Octopus
 * page (page_size 25000) and five NESO windows, so a cron run over many meters
 * stays well inside the edge-function wall clock. It matches the 30 days the
 * app requests on first link (OctopusIntegration fullSync(30)) and the
 * footprint screen's default range. Anything older is a one-off backfill.
 */
export const SYNC_LOOKBACK_CAP_DAYS = 30;
/** Re-read this much before the newest stored reading: Octopus fills late or corrected half-hours. */
export const SYNC_OVERLAP_MS = 2 * DAY_MS;
/** NESO /intensity/{from}/{to} allows at most 14 days; stay well under it. */
export const NESO_WINDOW_DAYS = 7;
/**
 * BH-127: if the newest stored reading is older than this and Octopus sends
 * nothing newer, the meter has stalled (meter exchange, no data from the DCC,
 * wrong serial). That is a failed sync, not a success: last_sync_at must not move.
 */
export const STALL_AFTER_MS = 2 * DAY_MS;
/** Octopus pages are 25,000 rows; 30 days is ~1,440. This only stops a runaway `next` loop. */
export const OCTOPUS_MAX_PAGES = 10;
export const DB_CHUNK_SIZE = 1000;
/** The calculate paths recompute the newest N readings per meter (≈10 days). */
export const CALC_READING_LIMIT = 500;

const OCTOPUS_BASE = 'https://api.octopus.energy/v1';
const NESO_BASE = 'https://api.carbonintensity.org.uk';

export interface OctopusReading {
  consumption: number;
  interval_start: string;
  interval_end: string;
}

export interface ConsumptionRow {
  interval_start: string;
  interval_end: string;
  consumption_kwh: number;
  mpan: string;
  serial_number: string;
}

type DbError = { message?: string } | null | undefined;

/** The only DB operations the pipeline needs. supabaseOctopusStore adapts a supabase-js client. */
export interface OctopusStore {
  latestReadingStart(mpan: string): Promise<{ value: string | null; error: DbError }>;
  upsertConsumption(rows: ConsumptionRow[]): Promise<{ error: DbError }>;
  upsertFootprint(rows: FootprintRow[]): Promise<{ error: DbError }>;
  recentConsumption(
    mpan: string,
    limit: number,
  ): Promise<{
    data: Array<{ interval_start: string; interval_end: string; consumption_kwh: number }> | null;
    error: DbError;
  }>;
  markSynced(userId: string, mpan: string, atIso: string): Promise<{ error: DbError }>;
  /**
   * BH-127: record that Octopus rejected the key (401/403) for this meter, so
   * get-status can show "Octopus rejected your key". Cleared by markSynced and
   * by save-credentials.
   */
  markSyncError(
    userId: string,
    mpan: string,
    error: string,
    atIso: string,
  ): Promise<{ error: DbError }>;
}

// ---------------------------------------------------------------------------
// Pure helpers

/** MPAN distributor prefix -> NESO region id (null = national). */
export function regionIdFromMpan(mpan: string): number | null {
  if (!mpan || mpan.length < 2) return null;
  const mapping: Record<string, number> = {
    '10': 10,
    '11': 9,
    '12': 13,
    '13': 6,
    '14': 8,
    '15': 4,
    '16': 3,
    '17': 2,
    '18': 1,
    '19': 12,
    '20': 11,
    '21': 7,
    '22': 14,
    '23': 5,
  };
  return mapping[mpan.substring(0, 2)] || null;
}

/** "…1234" — enough to tell meters apart in logs and cron responses. */
export function maskMpan(mpan: string): string {
  return mpan ? `…${mpan.slice(-4)}` : '…';
}

/**
 * Where a sync starts: just before the newest stored reading (minus the
 * overlap), never earlier than the cap. With nothing stored, fetch the full
 * cap. `requestedDays` (in-app sync) can widen it, still within the cap.
 */
export function computeSyncFrom(
  now: Date,
  latestStoredStart: string | null,
  requestedDays?: number,
): Date {
  const capMs = now.getTime() - SYNC_LOOKBACK_CAP_DAYS * DAY_MS;
  const latestKey = halfHourKey(latestStoredStart);
  let fromMs = latestKey === null ? capMs : latestKey * HALF_HOUR_MS - SYNC_OVERLAP_MS;
  if (requestedDays && Number.isFinite(requestedDays) && requestedDays > 0) {
    fromMs = Math.min(fromMs, now.getTime() - requestedDays * DAY_MS);
  }
  fromMs = Math.max(fromMs, capMs);
  // Octopus and NESO both work in half-hours; start on a boundary.
  return new Date(Math.floor(fromMs / HALF_HOUR_MS) * HALF_HOUR_MS);
}

/** Split [from, to) into NESO-sized windows, each padded by a half-hour so no boundary slot is lost. */
export function nesoWindows(from: Date, to: Date): Array<{ from: Date; to: Date }> {
  const out: Array<{ from: Date; to: Date }> = [];
  const step = NESO_WINDOW_DAYS * DAY_MS;
  for (let start = from.getTime(); start < to.getTime(); start += step) {
    const end = Math.min(start + step, to.getTime());
    out.push({ from: new Date(start - HALF_HOUR_MS), to: new Date(end + HALF_HOUR_MS) });
  }
  return out;
}

/** NESO wants YYYY-MM-DDThh:mmZ. */
function nesoTime(d: Date): string {
  return d.toISOString().slice(0, 16) + 'Z';
}

export function nesoIntensityUrl(from: Date, to: Date, regionId: number | null): string {
  return regionId
    ? `${NESO_BASE}/regional/intensity/${nesoTime(from)}/${nesoTime(to)}/regionid/${regionId}`
    : `${NESO_BASE}/intensity/${nesoTime(from)}/${nesoTime(to)}`;
}

function errText(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e)
    return String((e as { message: unknown }).message);
  return String(e);
}

// ---------------------------------------------------------------------------
// Fetchers

export interface ConsumptionFetch {
  ok: boolean;
  /** HTTP status of the last page fetched (0 = network error). */
  http_status: number;
  readings: OctopusReading[];
  pages: number;
  error?: string;
}

/** Fetch every page of consumption for one meter between from and to. */
export async function fetchOctopusConsumption(
  fetchFn: FetchLike,
  opts: { mpan: string; serial: string; authHeader: string; from: Date; to: Date },
): Promise<ConsumptionFetch> {
  const params = new URLSearchParams({
    period_from: opts.from.toISOString(),
    period_to: opts.to.toISOString(),
    page_size: '25000',
    order_by: 'period',
  });
  let url: string | null =
    `${OCTOPUS_BASE}/electricity-meter-points/${encodeURIComponent(opts.mpan)}` +
    `/meters/${encodeURIComponent(opts.serial)}/consumption/?${params}`;
  const readings: OctopusReading[] = [];
  let pages = 0;
  let status = 0;
  while (url) {
    if (pages >= OCTOPUS_MAX_PAGES) {
      return { ok: false, http_status: status, readings, pages, error: 'too_many_pages' };
    }
    // Only follow `next` links back to Octopus: the API key travels with them.
    if (!url.startsWith(`${OCTOPUS_BASE}/`)) {
      return { ok: false, http_status: status, readings, pages, error: 'unexpected_next_url' };
    }
    let res: Response;
    try {
      res = await fetchFn(url, { headers: { Authorization: opts.authHeader } });
    } catch (e) {
      return { ok: false, http_status: 0, readings, pages, error: `network: ${errText(e)}` };
    }
    status = res.status;
    pages++;
    if (!res.ok) {
      return { ok: false, http_status: status, readings, pages, error: `octopus_http_${status}` };
    }
    let body: { results?: unknown; next?: unknown };
    try {
      body = await res.json();
    } catch (e) {
      return { ok: false, http_status: status, readings, pages, error: `bad_json: ${errText(e)}` };
    }
    for (const r of Array.isArray(body.results) ? body.results : []) {
      const row = r as Partial<OctopusReading>;
      if (
        typeof row.consumption === 'number' &&
        Number.isFinite(row.consumption) &&
        halfHourKey(row.interval_start) !== null &&
        halfHourKey(row.interval_end) !== null
      ) {
        readings.push(row as OctopusReading);
      }
    }
    url = typeof body.next === 'string' && body.next ? body.next : null;
  }
  return { ok: true, http_status: status, readings, pages };
}

export interface IntensityFetch {
  map: Map<number, IntensityPoint>;
  /** Windows requested / windows that failed (HTTP, network or JSON). */
  windows: number;
  failed_windows: number;
  /** Status of the first failing window, else of the last one. */
  http_status: number;
  skipped: number;
}

/** NESO intensity (regional when the MPAN maps to a region) for [from, to), keyed by half-hour. */
export async function fetchIntensity(
  fetchFn: FetchLike,
  from: Date,
  to: Date,
  regionId: number | null,
): Promise<IntensityFetch> {
  const map = new Map<number, IntensityPoint>();
  const windows = nesoWindows(from, to);
  let failed = 0;
  let status = 0;
  let firstFailStatus: number | null = null;
  let skipped = 0;
  for (const w of windows) {
    try {
      const res = await fetchFn(nesoIntensityUrl(w.from, w.to, regionId));
      status = res.status;
      if (!res.ok) {
        failed++;
        firstFailStatus ??= res.status;
        continue;
      }
      const built = buildIntensityMap(await res.json(), regionId !== null);
      for (const [k, v] of built.map) map.set(k, v);
      skipped += built.skipped;
    } catch {
      failed++;
      firstFailStatus ??= 0;
    }
  }
  return {
    map,
    windows: windows.length,
    failed_windows: failed,
    http_status: firstFailStatus ?? status,
    skipped,
  };
}

// ---------------------------------------------------------------------------
// Pipeline steps

export interface FootprintResult {
  ok: boolean;
  footprints_written: number;
  intensity_status: number;
  intensity_failed_windows: number;
  error?: string;
}

/** Match readings to NESO half-hours and upsert carbon_footprint, checking every write. */
export async function writeFootprints(
  fetchFn: FetchLike,
  store: OctopusStore,
  mpan: string,
  readings: Array<{ interval_start: string; interval_end: string; kwh: number }>,
): Promise<FootprintResult> {
  const keys = readings.map((r) => halfHourKey(r.interval_start)).filter((k) => k !== null);
  if (keys.length === 0) {
    return { ok: true, footprints_written: 0, intensity_status: 0, intensity_failed_windows: 0 };
  }
  const minKey = Math.min(...(keys as number[]));
  const maxKey = Math.max(...(keys as number[]));
  const intensity = await fetchIntensity(
    fetchFn,
    new Date(minKey * HALF_HOUR_MS),
    new Date((maxKey + 1) * HALF_HOUR_MS),
    regionIdFromMpan(mpan),
  );
  const rows = buildFootprintRows(readings, intensity.map, mpan);
  let written = 0;
  let error: string | undefined;
  for (let i = 0; i < rows.length; i += DB_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + DB_CHUNK_SIZE);
    const { error: e } = await store.upsertFootprint(chunk);
    if (e) {
      error ??= `footprint_upsert: ${errText(e)}`;
      continue;
    }
    written += chunk.length;
  }
  if (!error && intensity.failed_windows > 0) {
    error = `neso_failed_windows: ${intensity.failed_windows}/${intensity.windows}`;
  }
  return {
    ok: !error,
    footprints_written: written,
    intensity_status: intensity.http_status,
    intensity_failed_windows: intensity.failed_windows,
    ...(error ? { error } : {}),
  };
}

export interface MeterSyncResult {
  mpan: string; // masked
  ok: boolean;
  /** Octopus HTTP status (0 = not called / network error). */
  http_status: number;
  readings_fetched: number;
  readings_stored: number;
  footprints_written: number;
  footprint_ok: boolean;
  last_sync_updated: boolean;
  period_from?: string;
  period_to?: string;
  error?: string;
  footprint_error?: string;
}

/**
 * One meter: fetch everything since the newest stored reading (capped),
 * store it, compute footprints, and only then mark last_sync_at.
 * last_sync_at moves only when Octopus answered 200 and every reading upsert
 * succeeded. A NESO/footprint failure is reported but doesn't block it,
 * because the readings themselves did sync; the next calculate run fills in.
 */
/** BH-127: Octopus errors that mean the stored key was rejected. */
export const KEY_REJECTED_ERRORS = new Set(['octopus_http_401', 'octopus_http_403']);

export async function syncMeter(
  deps: { fetch: FetchLike; store: OctopusStore; now?: () => Date },
  opts: {
    userId: string;
    mpan: string;
    serial: string;
    authHeader: string;
    requestedDays?: number;
  },
): Promise<MeterSyncResult> {
  const now = deps.now ? deps.now() : new Date();
  const base: MeterSyncResult = {
    mpan: maskMpan(opts.mpan),
    ok: false,
    http_status: 0,
    readings_fetched: 0,
    readings_stored: 0,
    footprints_written: 0,
    footprint_ok: false,
    last_sync_updated: false,
  };

  const latest = await deps.store.latestReadingStart(opts.mpan);
  if (latest.error) return { ...base, error: `latest_reading_query: ${errText(latest.error)}` };
  const from = computeSyncFrom(now, latest.value, opts.requestedDays);
  base.period_from = from.toISOString();
  base.period_to = now.toISOString();

  const fetched = await fetchOctopusConsumption(deps.fetch, {
    mpan: opts.mpan,
    serial: opts.serial,
    authHeader: opts.authHeader,
    from,
    to: now,
  });
  base.http_status = fetched.http_status;
  base.readings_fetched = fetched.readings.length;
  if (!fetched.ok) {
    if (fetched.error && KEY_REJECTED_ERRORS.has(fetched.error)) {
      // Best effort: a failed write here must not hide the 401 from the caller.
      await deps.store.markSyncError(opts.userId, opts.mpan, fetched.error, now.toISOString());
    }
    return { ...base, error: fetched.error };
  }

  const rows: ConsumptionRow[] = fetched.readings.map((r) => ({
    interval_start: halfHourKeyToIso(halfHourKey(r.interval_start)!),
    interval_end: halfHourKeyToIso(halfHourKey(r.interval_end)!),
    consumption_kwh: r.consumption,
    mpan: opts.mpan,
    serial_number: opts.serial,
  }));
  let storeError: string | undefined;
  for (let i = 0; i < rows.length; i += DB_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + DB_CHUNK_SIZE);
    const { error } = await deps.store.upsertConsumption(chunk);
    if (error) {
      storeError ??= `consumption_upsert: ${errText(error)}`;
      continue;
    }
    base.readings_stored += chunk.length;
  }

  const fp = await writeFootprints(
    deps.fetch,
    deps.store,
    opts.mpan,
    rows.map((r) => ({
      interval_start: r.interval_start,
      interval_end: r.interval_end,
      kwh: r.consumption_kwh,
    })),
  );
  base.footprints_written = fp.footprints_written;
  base.footprint_ok = fp.ok;
  if (fp.error) base.footprint_error = fp.error;

  if (storeError) return { ...base, error: storeError };

  // BH-127: Octopus answered 200 but sent nothing newer than what we already
  // hold, and that is over 48h old. Report it so the stall shows up in the
  // cron result and logs, and leave last_sync_at alone so it stays truthful.
  const latestKey = halfHourKey(latest.value);
  if (latestKey !== null && now.getTime() - latestKey * HALF_HOUR_MS > STALL_AFTER_MS) {
    const newestFetched = rows.reduce(
      (m, r) => Math.max(m, halfHourKey(r.interval_start) ?? -Infinity),
      -Infinity,
    );
    if (newestFetched <= latestKey) {
      return { ...base, error: 'no_new_readings' };
    }
  }

  const marked = await deps.store.markSynced(opts.userId, opts.mpan, now.toISOString());
  if (marked.error) return { ...base, error: `last_sync_update: ${errText(marked.error)}` };
  return { ...base, ok: true, last_sync_updated: true };
}

export interface MeterCalcResult {
  mpan: string; // masked
  ok: boolean;
  readings: number;
  footprints_written: number;
  intensity_status: number;
  error?: string;
}

/** Recompute footprints from the newest stored readings for one meter. */
export async function calculateMeterFootprint(
  deps: { fetch: FetchLike; store: OctopusStore },
  mpan: string,
  limit = CALC_READING_LIMIT,
): Promise<MeterCalcResult> {
  const base = { mpan: maskMpan(mpan), readings: 0, footprints_written: 0, intensity_status: 0 };
  const { data, error } = await deps.store.recentConsumption(mpan, limit);
  if (error) return { ...base, ok: false, error: `consumption_query: ${errText(error)}` };
  const readings = (data ?? []).map((r) => ({
    interval_start: r.interval_start,
    interval_end: r.interval_end,
    kwh: Number(r.consumption_kwh),
  }));
  base.readings = readings.length;
  if (readings.length === 0) return { ...base, ok: true };
  const fp = await writeFootprints(deps.fetch, deps.store, mpan, readings);
  return {
    ...base,
    ok: fp.ok,
    footprints_written: fp.footprints_written,
    intensity_status: fp.intensity_status,
    ...(fp.error ? { error: fp.error } : {}),
  };
}

/** Per-meter result for a user whose stored credentials couldn't be used. Counts as an error. */
export function credentialsUnavailableResult(
  mpan: string,
  reason: 'no_credentials' | 'credentials_unavailable',
): MeterSyncResult {
  return {
    mpan: maskMpan(mpan),
    ok: false,
    http_status: 0,
    readings_fetched: 0,
    readings_stored: 0,
    footprints_written: 0,
    footprint_ok: false,
    last_sync_updated: false,
    error: reason,
  };
}

export interface RunSummary {
  success: boolean;
  meters_ok: number;
  meters_failed: number;
  /** Meters whose readings synced but whose footprint step failed. */
  footprint_failures: number;
  readings_stored: number;
  footprints_written: number;
  errors: number;
}

export function summarise(results: Array<MeterSyncResult | MeterCalcResult>): RunSummary {
  let ok = 0;
  let failed = 0;
  let fpFail = 0;
  let readings = 0;
  let footprints = 0;
  for (const r of results) {
    if (r.ok) ok++;
    else failed++;
    if ('footprint_ok' in r) {
      if (r.ok && !r.footprint_ok) fpFail++;
      readings += r.readings_stored;
    }
    footprints += r.footprints_written;
  }
  const errors = failed + fpFail;
  return {
    success: errors === 0,
    meters_ok: ok,
    meters_failed: failed,
    footprint_failures: fpFail,
    readings_stored: readings,
    footprints_written: footprints,
    errors,
  };
}

// ---------------------------------------------------------------------------
// supabase-js adapter

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export function supabaseOctopusStore(supabase: AnyClient): OctopusStore {
  return {
    async latestReadingStart(mpan) {
      const { data, error } = await supabase
        .from('octopus_consumption')
        .select('interval_start')
        .eq('mpan', mpan)
        .order('interval_start', { ascending: false })
        .limit(1);
      return { value: (data?.[0]?.interval_start as string | undefined) ?? null, error };
    },
    async upsertConsumption(rows) {
      const { error } = await supabase
        .from('octopus_consumption')
        .upsert(rows, { onConflict: 'mpan,interval_start' });
      return { error };
    },
    async upsertFootprint(rows) {
      const { error } = await supabase
        .from('carbon_footprint')
        .upsert(rows, { onConflict: 'mpan,interval_start' });
      return { error };
    },
    async recentConsumption(mpan, limit) {
      const { data, error } = await supabase
        .from('octopus_consumption')
        .select('interval_start, interval_end, consumption_kwh')
        .eq('mpan', mpan)
        .order('interval_start', { ascending: false })
        .limit(limit);
      return { data, error };
    },
    async markSynced(userId, mpan, atIso) {
      const { error } = await supabase
        .from('octopus_meters')
        .update({ last_sync_at: atIso, last_sync_error: null, last_sync_error_at: null })
        .eq('mpan', mpan)
        .eq('user_id', userId);
      return { error };
    },
    async markSyncError(userId, mpan, syncError, atIso) {
      const { error } = await supabase
        .from('octopus_meters')
        .update({ last_sync_error: syncError, last_sync_error_at: atIso })
        .eq('mpan', mpan)
        .eq('user_id', userId);
      return { error };
    },
  };
}
