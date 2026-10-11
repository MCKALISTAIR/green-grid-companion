/**
 * Live GB generation mix (in MW) for the grid-demand edge function.
 *
 * Why this exists: grid-demand used to read NESO's "Historic Demand Data 2025"
 * resource, whose newest row is 31 Dec 2025 (ND 24,730 MW). Every per-fuel GW
 * figure was today's Carbon Intensity % share multiplied by that frozen total,
 * so the app showed "Total 24.7 GW" forever.
 *
 * Sources now (all public, no API key):
 *
 * 1. Elexon Insights (BMRS) FUELINST: metered output of transmission-connected
 *    generation by fuel type plus interconnector flows, 5-minute resolution,
 *    usually published within ~5-10 minutes.
 *    https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELINST
 *    Licence: BMRS Data Licence. Attribution required:
 *    "Contains BMRS data © Elexon Limited copyright and database right {year}".
 *    https://www.elexon.co.uk/bsc/data/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/
 *
 * 2. NESO Data Portal "Embedded Solar and Wind Forecast" (resource
 *    db6c038f-98af-4570-ab60-24d71ebd0ae5, refreshed hourly). Solar and small
 *    wind on the distribution network are not metered in real time, so no live
 *    feed exists for them: NESO's own estimate for the current half hour is the
 *    best available figure, and the API flags it as an estimate. (NESO's
 *    "Demand Data Update", 177f6fa4-…, only has outturn ~3 hours behind, so it
 *    is not used for "now".)
 *    https://www.neso.energy/data-portal/embedded-wind-and-solar-forecasts
 *    Licence: NESO Open Data Licence v1.0. Attribution required:
 *    "Supported by National Energy SO Open Data".
 *    https://www.neso.energy/data-portal/neso-open-licence
 *
 * 3. Elexon Insights system frequency (FREQ, 15-second readings).
 *    https://data.elexon.co.uk/bmrs/api/v1/system/frequency
 *
 * Rules: real MW per fuel only (no share × total); every figure carries the
 * time it describes; anything older than the thresholds below is refused, not
 * shown; an upstream failure means "unavailable", never a made-up fallback.
 *
 * Pure functions only (no Deno APIs) so Vitest can run them against recorded
 * fixtures in src/test/fixtures/grid-demand.
 */

export const ELEXON_BASE = 'https://data.elexon.co.uk/bmrs/api/v1';
export const NESO_CKAN_BASE = 'https://api.neso.energy/api/3/action';
export const NESO_EMBEDDED_FORECAST_RESOURCE = 'db6c038f-98af-4570-ab60-24d71ebd0ae5';

/** FUELINST lands every 5 min with a ~5-10 min lag; 20 min = several missed publications. */
export const MIX_MAX_AGE_MINUTES = 20;
/** FREQ readings land every 15 s with a ~2 min lag. */
export const FREQUENCY_MAX_AGE_MINUTES = 10;
/**
 * NESO's embedded forecast is a rolling run that starts at the latest half hour.
 * If the current settlement period is not within the first N rows, the run is
 * more than ~N/2 hours old and we treat the estimate as stale.
 */
export const EMBEDDED_MAX_RUN_OFFSET = 8;

/** Same fuel ids the app already uses (from the Carbon Intensity API). */
export const MIX_FUELS = ['biomass', 'coal', 'imports', 'gas', 'nuclear', 'other', 'hydro', 'solar', 'wind'] as const;
export type MixFuel = (typeof MIX_FUELS)[number];

export function fuelinstUrl(now: Date, windowMinutes = 45): string {
  const from = new Date(now.getTime() - windowMinutes * 60_000).toISOString();
  const params = new URLSearchParams({ publishDateTimeFrom: from, publishDateTimeTo: now.toISOString(), format: 'json' });
  return `${ELEXON_BASE}/datasets/FUELINST?${params}`;
}

export function frequencyUrl(now: Date, windowMinutes = 15): string {
  const from = new Date(now.getTime() - windowMinutes * 60_000).toISOString();
  // Without from/to this endpoint returns the whole of *yesterday*, which is why
  // the old code never showed a live value.
  const params = new URLSearchParams({ from, to: now.toISOString(), format: 'json' });
  return `${ELEXON_BASE}/system/frequency?${params}`;
}

export function embeddedForecastUrl(): string {
  const params = new URLSearchParams({
    resource_id: NESO_EMBEDDED_FORECAST_RESOURCE,
    limit: String(EMBEDDED_MAX_RUN_OFFSET),
    sort: '_id asc',
  });
  return `${NESO_CKAN_BASE}/datastore_search?${params}`;
}

// ---------------------------------------------------------------------------
// FUELINST

export interface FuelinstSnapshot {
  /** Start of the 5-minute interval the figures describe (ISO, UTC). */
  startTime: string;
  publishTime: string;
  settlementDate: string;
  settlementPeriod: number;
  /** MW by Elexon fuel type (interconnectors and pumped storage can be negative). */
  byFuelType: Record<string, number>;
}

interface FuelinstRow {
  startTime: string;
  publishTime: string;
  settlementDate: string;
  settlementPeriod: number;
  fuelType: string;
  generation: number;
}

function isFuelinstRow(r: unknown): r is FuelinstRow {
  const x = r as Partial<FuelinstRow> | null;
  return !!x && typeof x.startTime === 'string' && typeof x.publishTime === 'string'
    && typeof x.settlementDate === 'string' && typeof x.settlementPeriod === 'number'
    && typeof x.fuelType === 'string' && typeof x.generation === 'number' && Number.isFinite(x.generation);
}

/** A snapshot needs the big fuels present, otherwise it is a partial publication. */
const REQUIRED_FUEL_TYPES = ['CCGT', 'NUCLEAR', 'WIND', 'BIOMASS'];

/**
 * Latest complete 5-minute snapshot from a FUELINST response
 * ({ data: [...] } or a bare array). Revisions: the newest publishTime wins.
 */
export function latestFuelinstSnapshot(payload: unknown): FuelinstSnapshot | null {
  const rows = Array.isArray(payload) ? payload : (payload as { data?: unknown })?.data;
  if (!Array.isArray(rows)) return null;

  const byStart = new Map<string, Map<string, FuelinstRow>>();
  for (const r of rows) {
    if (!isFuelinstRow(r)) continue;
    const fuels = byStart.get(r.startTime) ?? new Map<string, FuelinstRow>();
    const prev = fuels.get(r.fuelType);
    if (!prev || Date.parse(r.publishTime) > Date.parse(prev.publishTime)) fuels.set(r.fuelType, r);
    byStart.set(r.startTime, fuels);
  }

  const starts = [...byStart.keys()].sort((a, b) => Date.parse(b) - Date.parse(a));
  for (const start of starts) {
    const fuels = byStart.get(start)!;
    if (!REQUIRED_FUEL_TYPES.every(f => fuels.has(f))) continue;
    const list = [...fuels.values()];
    const latestPublish = list.reduce((m, r) => (Date.parse(r.publishTime) > Date.parse(m) ? r.publishTime : m), list[0].publishTime);
    return {
      startTime: new Date(start).toISOString(),
      publishTime: new Date(latestPublish).toISOString(),
      settlementDate: list[0].settlementDate,
      settlementPeriod: list[0].settlementPeriod,
      byFuelType: Object.fromEntries(list.map(r => [r.fuelType, r.generation])),
    };
  }
  return null;
}

/** Elexon fuel type → app fuel id. Interconnectors (INT*) are handled separately. */
export function appFuelFor(fuelType: string): MixFuel {
  switch (fuelType.toUpperCase()) {
    case 'CCGT':
    case 'OCGT':
      return 'gas';
    case 'COAL': return 'coal';
    case 'NUCLEAR': return 'nuclear';
    case 'WIND': return 'wind';
    case 'BIOMASS': return 'biomass';
    case 'NPSHYD': return 'hydro';
    // Pumped storage releases stored energy, so it is not counted as hydro
    // (which the app treats as renewable). OIL and OTHER are small.
    default: return 'other';
  }
}

// ---------------------------------------------------------------------------
// NESO embedded solar + wind

export interface EmbeddedEstimate {
  solarMW: number;
  windMW: number;
  settlementDate: string;
  settlementPeriod: number;
}

/** Estimate for one settlement period, only if it sits near the start of NESO's latest run. */
export function embeddedForPeriod(payload: unknown, settlementDate: string, settlementPeriod: number): EmbeddedEstimate | null {
  const result = (payload as { success?: boolean; result?: { records?: unknown } })?.result;
  if ((payload as { success?: boolean })?.success === false) return null;
  const records = result?.records;
  if (!Array.isArray(records)) return null;
  const sorted = [...records].sort((a, b) => Number((a as { _id?: number })._id) - Number((b as { _id?: number })._id));
  for (const raw of sorted.slice(0, EMBEDDED_MAX_RUN_OFFSET)) {
    const r = raw as Record<string, unknown>;
    if (typeof r.SETTLEMENT_DATE !== 'string' || r.SETTLEMENT_DATE.slice(0, 10) !== settlementDate) continue;
    if (Number(r.SETTLEMENT_PERIOD) !== settlementPeriod) continue;
    const solar = Number(r.EMBEDDED_SOLAR_FORECAST);
    const wind = Number(r.EMBEDDED_WIND_FORECAST);
    if (r.EMBEDDED_SOLAR_FORECAST == null || r.EMBEDDED_WIND_FORECAST == null) return null;
    if (!Number.isFinite(solar) || !Number.isFinite(wind) || solar < 0 || wind < 0) return null;
    return { solarMW: solar, windMW: wind, settlementDate, settlementPeriod };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Frequency

export function latestFrequency(payload: unknown, now: Date): { frequency: number; measurementTime: string } | null {
  const rows = Array.isArray(payload) ? payload : (payload as { data?: unknown })?.data;
  if (!Array.isArray(rows)) return null;
  let best: { frequency: number; measurementTime: string } | null = null;
  for (const r of rows as { measurementTime?: unknown; frequency?: unknown }[]) {
    if (typeof r?.measurementTime !== 'string' || typeof r.frequency !== 'number') continue;
    if (!Number.isFinite(r.frequency) || r.frequency < 45 || r.frequency > 55) continue;
    if (!best || Date.parse(r.measurementTime) > Date.parse(best.measurementTime)) {
      best = { frequency: r.frequency, measurementTime: new Date(r.measurementTime).toISOString() };
    }
  }
  if (!best) return null;
  const ageMin = (now.getTime() - Date.parse(best.measurementTime)) / 60_000;
  return ageMin <= FREQUENCY_MAX_AGE_MINUTES ? best : null;
}

// ---------------------------------------------------------------------------
// Response

export interface MixEntry { id: MixFuel; name: MixFuel; perc: number; mw: number }

export type UnavailableReason = 'mix_fetch_failed' | 'mix_stale' | 'embedded_unavailable';

interface Common {
  /** When the edge function ran. Not the age of the data. */
  fetchedAt: string;
  gridFrequency: number | null;
  frequencyTime: string | null;
}

export interface GridDemandOk extends Common {
  status: 'ok';
  /** Time the figures describe (start of the 5-min FUELINST interval). The UI's "updated" time. */
  timestamp: string;
  dataTime: string;
  publishTime: string;
  settlementDate: string;
  settlementPeriod: number;
  /** Supply minus exports: everything consumed in GB, including embedded solar and wind. */
  totalDemandMW: number;
  /** Sum of the mix (GB generation + imports). Per-fuel % are shares of this. */
  totalSupplyMW: number;
  exportsMW: number;
  embeddedSolarMW: number;
  embeddedWindMW: number;
  /** Embedded solar and wind are NESO estimates for this half hour, not meter readings. */
  embeddedIsEstimate: true;
  mix: MixEntry[];
  sources: string[];
}

export interface GridDemandUnavailable extends Common {
  status: 'unavailable';
  reason: UnavailableReason;
  timestamp: null;
  /** Time of the newest figures we saw, if any (lets the UI say how old they were). */
  dataTime: string | null;
  totalDemandMW: null;
  embeddedSolarMW: null;
  embeddedWindMW: null;
  mix: [];
}

export type GridDemandResponse = GridDemandOk | GridDemandUnavailable;

export interface BuildInput {
  now: Date;
  /** Parsed JSON of a FUELINST response, or null if the request failed. */
  fuelinst: unknown | null;
  embedded: unknown | null;
  frequency: unknown | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildGridDemand({ now, fuelinst, embedded, frequency }: BuildInput): GridDemandResponse {
  const freq = frequency == null ? null : latestFrequency(frequency, now);
  const common: Common = {
    fetchedAt: now.toISOString(),
    gridFrequency: freq?.frequency ?? null,
    frequencyTime: freq?.measurementTime ?? null,
  };
  const unavailable = (reason: UnavailableReason, dataTime: string | null): GridDemandUnavailable => ({
    ...common, status: 'unavailable', reason, timestamp: null, dataTime,
    totalDemandMW: null, embeddedSolarMW: null, embeddedWindMW: null, mix: [],
  });

  const snap = fuelinst == null ? null : latestFuelinstSnapshot(fuelinst);
  if (!snap) return unavailable('mix_fetch_failed', null);
  const ageMin = (now.getTime() - Date.parse(snap.startTime)) / 60_000;
  if (ageMin > MIX_MAX_AGE_MINUTES) return unavailable('mix_stale', snap.startTime);

  const emb = embedded == null ? null : embeddedForPeriod(embedded, snap.settlementDate, snap.settlementPeriod);
  // Midday solar is several GW: a mix without it would be badly wrong, so refuse.
  if (!emb) return unavailable('embedded_unavailable', snap.startTime);

  const mw: Record<MixFuel, number> = { biomass: 0, coal: 0, imports: 0, gas: 0, nuclear: 0, other: 0, hydro: 0, solar: 0, wind: 0 };
  let exportsMW = 0;
  for (const [fuelType, gen] of Object.entries(snap.byFuelType)) {
    if (fuelType.toUpperCase().startsWith('INT')) {
      if (gen > 0) mw.imports += gen; else exportsMW += -gen;
      continue;
    }
    // Negative pumped storage = pumping (consumption), not supply.
    if (gen > 0) mw[appFuelFor(fuelType)] += gen;
  }
  mw.solar += emb.solarMW;
  mw.wind += emb.windMW;

  const totalSupplyMW = MIX_FUELS.reduce((s, f) => s + mw[f], 0);
  if (totalSupplyMW <= 0) return unavailable('mix_fetch_failed', snap.startTime);

  const mix: MixEntry[] = MIX_FUELS
    .map(f => ({ id: f, name: f, mw: Math.round(mw[f]), perc: round1((mw[f] / totalSupplyMW) * 100) }))
    .sort((a, b) => b.mw - a.mw);

  return {
    ...common,
    status: 'ok',
    timestamp: snap.startTime,
    dataTime: snap.startTime,
    publishTime: snap.publishTime,
    settlementDate: snap.settlementDate,
    settlementPeriod: snap.settlementPeriod,
    totalDemandMW: Math.round(totalSupplyMW - exportsMW),
    totalSupplyMW: Math.round(totalSupplyMW),
    exportsMW: Math.round(exportsMW),
    embeddedSolarMW: Math.round(emb.solarMW),
    embeddedWindMW: Math.round(emb.windMW),
    embeddedIsEstimate: true,
    mix,
    sources: ['Elexon BMRS FUELINST', 'NESO Embedded Solar and Wind Forecast', ...(freq ? ['Elexon BMRS FREQ'] : [])],
  };
}
