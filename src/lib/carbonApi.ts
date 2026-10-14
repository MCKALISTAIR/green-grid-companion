// UK Carbon Intensity API Integration
import { toOutwardCode } from '@/lib/postcode';

const BASE_URL = 'https://api.carbonintensity.org.uk';

export interface IntensityData {
  from: string;
  to: string;
  intensity: {
    forecast: number;
    actual: number | null;
    index: 'very low' | 'low' | 'moderate' | 'high' | 'very high';
  };
}

export interface GenerationMix {
  fuel: string;
  perc: number;
}

export interface RegionalData {
  regionid: number;
  dnoregion: string;
  shortname: string;
  postcode?: string;
  data: {
    from: string;
    to: string;
    intensity: {
      forecast: number;
      actual: number | null;
      index: 'very low' | 'low' | 'moderate' | 'high' | 'very high';
    };
    generationmix: GenerationMix[];
  }[];
}

export interface ForecastData {
  from: string;
  to: string;
  intensity: {
    forecast: number;
    actual?: number | null;
    /**
     * True when `actual` was not published by NESO and GridSense calculated it
     * from the generation mix (calculateIntensityFromMix). The regional API has
     * no actuals, so past regional values are always app estimates.
     */
    actualEstimated?: boolean;
    index: 'very low' | 'low' | 'moderate' | 'high' | 'very high';
  };
  generationmix?: GenerationMix[];
}

/** True when the item's "actual" is a GridSense estimate rather than a NESO figure. */
export function isEstimatedActual(item: Pick<ForecastData, 'intensity'>): boolean {
  return Boolean(item.intensity?.actualEstimated);
}

/** Series label for past values: "Estimate" if any value is an app estimate. */
export function actualSeriesLabel(items: Pick<ForecastData, 'intensity'>[]): 'Actual' | 'Estimate' {
  return items.some(isEstimatedActual) ? 'Estimate' : 'Actual';
}

/**
 * Live "now" intensity for the home hero and alerts.
 *
 * Prefer NESO's published `actual` once it fills for the current half-hour;
 * otherwise use `forecast`. Regional endpoints usually omit actuals, so this
 * mostly improves the national view without changing regional behaviour.
 */
export function pickLiveIntensity(
  intensity:
    | {
        forecast?: number | null;
        actual?: number | null;
      }
    | null
    | undefined,
): number | null {
  if (!intensity) return null;
  const { actual, forecast } = intensity;
  if (typeof actual === 'number' && Number.isFinite(actual) && actual >= 0) return actual;
  if (typeof forecast === 'number' && Number.isFinite(forecast) && forecast >= 0) return forecast;
  return null;
}

export const REGION_IDS = {
  NATIONAL: 0,
  SCOTLAND: 16,
  ENGLAND: 15,
  WALES: 17,
} as const;

interface RegionConfig {
  id: number;
  name: string;
  postcodes: string[];
}

export const UK_REGIONS_CONFIG: RegionConfig[] = [
  { id: REGION_IDS.NATIONAL, name: 'National', postcodes: ['GB'] },
  { id: REGION_IDS.SCOTLAND, name: 'Scotland', postcodes: ['Scotland'] },
  { id: REGION_IDS.ENGLAND, name: 'England', postcodes: ['England'] },
  { id: REGION_IDS.WALES, name: 'Wales', postcodes: ['Wales'] },
  { id: 1, name: 'North Scotland', postcodes: ['AB', 'IV', 'KW', 'PH', 'ZE', 'HS'] },
  {
    id: 2,
    name: 'South Scotland',
    postcodes: ['EH', 'FK', 'G', 'KA', 'KY', 'ML', 'PA', 'TD', 'DG'],
  },
  { id: 3, name: 'North West England', postcodes: ['M'] },
  { id: 4, name: 'North East England', postcodes: ['NE'] },
  { id: 5, name: 'Yorkshire', postcodes: ['LS'] },
  { id: 6, name: 'North Wales & Merseyside', postcodes: ['LL'] },
  { id: 7, name: 'South Wales', postcodes: ['CF'] },
  { id: 8, name: 'West Midlands', postcodes: ['B'] },
  { id: 9, name: 'East Midlands', postcodes: ['NG'] },
  { id: 10, name: 'East England', postcodes: ['CB'] },
  { id: 11, name: 'South West England', postcodes: ['BS'] },
  { id: 12, name: 'South England', postcodes: ['SO'] },
  { id: 13, name: 'London', postcodes: ['SW', 'SE', 'E', 'EC', 'N', 'NW', 'W', 'WC'] },
  { id: 14, name: 'South East England', postcodes: ['BN'] },
];

export const UK_REGIONS = UK_REGIONS_CONFIG.flatMap((region) =>
  region.postcodes.map((postcode) => ({
    id: region.id,
    name: region.name,
    postcode,
  })),
);

// Helper for fetch with optional AbortSignal
const fetchWithNoCache = async (url: string, signal?: AbortSignal) => {
  const response = await fetch(url, { signal });
  return response;
};

// Get current national intensity
export async function getCurrentIntensity(signal?: AbortSignal): Promise<IntensityData> {
  const response = await fetchWithNoCache(`${BASE_URL}/intensity`, signal);
  const data = await response.json();
  return data.data[0];
}

// Get intensity for a specific postcode
export async function getRegionalIntensity(
  postcode: string,
  signal?: AbortSignal,
): Promise<RegionalData> {
  const cleanPostcode = toOutwardCode(postcode).toUpperCase();
  const response = await fetchWithNoCache(`${BASE_URL}/regional/postcode/${cleanPostcode}`, signal);
  if (!response.ok) {
    throw new Error(`Failed to fetch regional data: ${response.status}`);
  }
  const data = await response.json();
  // The API returns data in format: { data: [{ regionid, shortname, data: [...] }] }
  return data.data[0];
}

// Get 48hr forecast for a postcode
export async function getRegionalForecast(
  postcode: string,
  signal?: AbortSignal,
): Promise<ForecastData[]> {
  const cleanPostcode = toOutwardCode(postcode).toUpperCase();
  const now = new Date().toISOString();
  const response = await fetchWithNoCache(
    `${BASE_URL}/regional/intensity/${now}/fw48h/postcode/${cleanPostcode}`,
    signal,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch forecast: ${response.status}`);
  }
  const json = await response.json();
  // The API response structure is: { data: { regionid, shortname, data: [...] } }
  return json.data?.data || [];
}

// Get 48hr forecast for a region ID
export async function getRegionalForecastById(
  regionId: number,
  signal?: AbortSignal,
): Promise<ForecastData[]> {
  const now = new Date().toISOString();
  // Valid endpoint format: /regional/intensity/{from}/fw48h/regionid/{regionid}
  const response = await fetchWithNoCache(
    `${BASE_URL}/regional/intensity/${now}/fw48h/regionid/${regionId}`,
    signal,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch forecast: ${response.status}`);
  }
  const json = await response.json();
  // Response: { data: { regionid, ... data: [] } }
  return json.data?.data || [];
}

// Get 48hr forecast + history for a region ID
export async function getRegionalHistoryAndForecast(
  regionId: number,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<ForecastData[]> {
  // Endpoint: /regional/intensity/{from}/{to}/regionid/{regionid}
  const response = await fetchWithNoCache(
    `${BASE_URL}/regional/intensity/${from}/${to}/regionid/${regionId}`,
    signal,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch history/forecast: ${response.status}`);
  }
  const json = await response.json();
  const data: ForecastData[] = json.data?.data || [];

  // Backfill 'actual' if missing, using generation mix, for half-hours that have
  // already happened. Future rows keep NESO's forecast only: backfilling them made
  // the hourly chart's bar (estimate) disagree with its tooltip (forecast).
  // Only when there is a real mix to work from: an empty or missing mix stays
  // null (never a fake 0).
  const nowMs = Date.now();
  return data.map((item) => {
    const endMs = Date.parse(item.to);
    const hasEnded = Number.isFinite(endMs) ? endMs <= nowMs : false;
    if (hasEnded && (item.intensity.actual === undefined || item.intensity.actual === null)) {
      const mix = item.generationmix;
      if (hasUsableMix(mix)) {
        item.intensity.actual = calculateIntensityFromMix(mix, regionId);
        item.intensity.actualEstimated = true;
      }
    }
    return item;
  });
}

function hasUsableMix(mix: GenerationMix[] | undefined): mix is GenerationMix[] {
  if (!Array.isArray(mix) || mix.length === 0) return false;
  const total = mix.reduce((sum, m) => sum + (Number.isFinite(m?.perc) ? m.perc : 0), 0);
  return total > 0;
}

// Get National history + forecast
export async function getNationalHistoryAndForecast(
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<ForecastData[]> {
  // Endpoint: /intensity/{from}/{to}
  const response = await fetchWithNoCache(`${BASE_URL}/intensity/${from}/${to}`, signal);
  if (!response.ok) {
    throw new Error(`Failed to fetch national history: ${response.status}`);
  }
  const json = await response.json();
  const data: ForecastData[] = json.data || [];
  return data;
}

// Get intensity for a specific region ID
export async function getRegionalIntensityById(
  regionId: number,
  signal?: AbortSignal,
): Promise<RegionalData> {
  const response = await fetchWithNoCache(`${BASE_URL}/regional/regionid/${regionId}`, signal);
  if (!response.ok) {
    throw new Error(`Failed to fetch regional data: ${response.status}`);
  }
  const data = await response.json();
  return data.data[0];
}

// Get national generation mix
export async function getGenerationMix(signal?: AbortSignal): Promise<GenerationMix[]> {
  const response = await fetchWithNoCache(`${BASE_URL}/generation`, signal);
  const data = await response.json();
  return data.data.generationmix;
}

// Interface for items in the /regional endpoint
export interface RegionListItem {
  regionid: number;
  dnoregion: string;
  shortname: string;
  intensity: {
    forecast: number;
    index: 'very low' | 'low' | 'moderate' | 'high' | 'very high';
  };
  generationmix: GenerationMix[];
}

// Get all regions
export async function getAllRegions(signal?: AbortSignal): Promise<RegionListItem[]> {
  const response = await fetchWithNoCache(`${BASE_URL}/regional`, signal);
  const data = await response.json();
  return data.data[0]?.regions || [];
}

// Helper to get intensity color class
export function getIntensityColor(index: string): string {
  const colors: Record<string, string> = {
    'very low': 'bg-intensity-very-low',
    low: 'bg-intensity-low',
    moderate: 'bg-intensity-moderate',
    high: 'bg-intensity-high',
    'very high': 'bg-intensity-very-high',
  };
  return colors[index] || 'bg-muted';
}

export function getIntensityTextColor(index: string): string {
  const colors: Record<string, string> = {
    'very low': 'text-intensity-very-low',
    low: 'text-intensity-low',
    moderate: 'text-intensity-moderate',
    high: 'text-intensity-high',
    'very high': 'text-intensity-very-high',
  };
  return colors[index] || 'text-muted-foreground';
}

// Get fuel color
export function getFuelColor(fuel: string): string {
  const colors: Record<string, string> = {
    wind: 'bg-gen-wind',
    solar: 'bg-gen-solar',
    nuclear: 'bg-gen-nuclear',
    gas: 'bg-gen-gas',
    coal: 'bg-gen-coal',
    hydro: 'bg-gen-hydro',
    biomass: 'bg-gen-biomass',
    imports: 'bg-gen-imports',
    other: 'bg-gen-other',
  };
  return colors[fuel.toLowerCase()] || 'bg-muted';
}

/**
 * Per-fuel carbon intensity factors (gCO₂/kWh), from NESO's Carbon Intensity
 * methodology, Table 1, and the live factors endpoint:
 *   https://github.com/carbon-intensity/methodology/raw/master/Carbon%20Intensity%20Forecast%20Methodology.pdf
 *   https://api.carbonintensity.org.uk/intensity/factors
 *
 * Mapping from the API's generation-mix fuels:
 * - gas: NESO publishes Combined Cycle 394 and Open Cycle 651; the mix only
 *   says "gas", so we use CCGT (394), which supplies almost all GB gas power.
 * - other: NESO "Other" 300. (Oil, 935, isn't a separate fuel in the mix.)
 * - nuclear, hydro, solar, wind (and pumped storage): 0.
 * - imports: NESO has no single import factor. It works one out per
 *   interconnected country each day from ENTSO-E data (defaults: French 53,
 *   Belgian 179, Irish 458, Dutch 474) and the mix doesn't say where imports
 *   came from. Default is the French figure (53). A few regions systematically
 *   disagree with that default vs NESO's own regional forecasts — see
 *   REGION_IMPORTS_FACTOR. Past regional values remain GridSense estimates,
 *   never NESO actuals.
 */
export const IMPORTS_FACTOR = 53;

/**
 * Region-specific imports factors (gCO₂/kWh) where the national default
 * mis-tracks NESO regional forecasts by ≥ ~3 g MAE on average.
 *
 * Calibrated against NESO regional forecast vs mix over two windows
 * (23 Sep–14 Oct 2026). Only stable overrides are listed:
 * - 10 East England ≈ North Sea interconnectors (Irish/Dutch class)
 * - 13 London ≈ mixed continental interconnectors
 * - 4 North East England ≈ slightly cleaner than French default
 *
 * Re-check with `npm run audit:neso` after changing these.
 */
export const REGION_IMPORTS_FACTOR: Readonly<Record<number, number>> = {
  4: 40,
  10: 405,
  13: 120,
};

export const CARBON_FACTORS: Record<string, number> = {
  biomass: 120,
  coal: 937,
  imports: IMPORTS_FACTOR,
  gas: 394,
  nuclear: 0,
  other: 300,
  hydro: 0,
  solar: 0,
  wind: 0,
};

/** Imports factor for a NESO region id; falls back to the French default. */
export function importsFactorForRegion(regionId?: number | null): number {
  if (regionId == null) return IMPORTS_FACTOR;
  return REGION_IMPORTS_FACTOR[regionId] ?? IMPORTS_FACTOR;
}

/** Full factor table for a region (only `imports` may differ from the default). */
export function carbonFactorsForRegion(regionId?: number | null): Record<string, number> {
  const imports = importsFactorForRegion(regionId);
  if (imports === IMPORTS_FACTOR) return CARBON_FACTORS;
  return { ...CARBON_FACTORS, imports };
}

/**
 * Estimate gCO₂/kWh from a generation mix. Pass `regionId` for regional
 * history backfill so high-import regions use a calibrated imports factor.
 */
export function calculateIntensityFromMix(mix: GenerationMix[], regionId?: number | null): number {
  if (!mix || mix.length === 0) return 0;

  const factors = carbonFactorsForRegion(regionId);
  let totalIntensity = 0;
  mix.forEach((source) => {
    const factor = factors[source.fuel] ?? 0;
    // perc is 0-100
    totalIntensity += (source.perc / 100) * factor;
  });

  return Math.round(totalIntensity);
}
