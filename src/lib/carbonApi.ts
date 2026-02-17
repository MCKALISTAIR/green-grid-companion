// UK Carbon Intensity API Integration
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
    index: 'very low' | 'low' | 'moderate' | 'high' | 'very high';
  };
  generationmix?: GenerationMix[];
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
  { id: 2, name: 'South Scotland', postcodes: ['EH', 'FK', 'G', 'KA', 'KY', 'ML', 'PA', 'TD', 'DG'] },
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
  }))
);

// Helper for fetch (now allows caching)
const fetchWithNoCache = async (url: string) => {
  // We allow browser caching now to save bandwidth
  // The API sends correct ETag/Cache-Control headers
  const response = await fetch(url);
  return response;
};

// Get current national intensity
export async function getCurrentIntensity(): Promise<IntensityData> {
  const response = await fetchWithNoCache(`${BASE_URL}/intensity`);
  const data = await response.json();
  return data.data[0];
}

// Get intensity for a specific postcode
export async function getRegionalIntensity(postcode: string): Promise<RegionalData> {
  const cleanPostcode = postcode.split(' ')[0].toUpperCase();
  const response = await fetchWithNoCache(`${BASE_URL}/regional/postcode/${cleanPostcode}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch regional data: ${response.status}`);
  }
  const data = await response.json();
  // The API returns data in format: { data: [{ regionid, shortname, data: [...] }] }
  return data.data[0];
}

// Get 48hr forecast for a postcode  
export async function getRegionalForecast(postcode: string): Promise<ForecastData[]> {
  const cleanPostcode = postcode.split(' ')[0].toUpperCase();
  const now = new Date().toISOString();
  const response = await fetchWithNoCache(`${BASE_URL}/regional/intensity/${now}/fw48h/postcode/${cleanPostcode}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch forecast: ${response.status}`);
  }
  const json = await response.json();
  // The API response structure is: { data: { regionid, shortname, data: [...] } }
  return json.data?.data || [];
}

// Get 48hr forecast for a region ID
export async function getRegionalForecastById(regionId: number): Promise<ForecastData[]> {
  const now = new Date().toISOString();
  // Valid endpoint format: /regional/intensity/{from}/fw48h/regionid/{regionid}
  const response = await fetchWithNoCache(`${BASE_URL}/regional/intensity/${now}/fw48h/regionid/${regionId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch forecast: ${response.status}`);
  }
  const json = await response.json();
  // Response: { data: { regionid, ... data: [] } }
  return json.data?.data || [];
}

// Get 48hr forecast + history for a region ID
export async function getRegionalHistoryAndForecast(regionId: number, from: string, to: string): Promise<ForecastData[]> {
  // Endpoint: /regional/intensity/{from}/{to}/regionid/{regionid}
  const response = await fetchWithNoCache(`${BASE_URL}/regional/intensity/${from}/${to}/regionid/${regionId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch history/forecast: ${response.status}`);
  }
  const json = await response.json();
  const data: ForecastData[] = json.data?.data || [];

  // Backfill 'actual' if missing, using generation mix
  return data.map(item => {
    if (item.intensity.actual === undefined || item.intensity.actual === null) {
      const mix = item.generationmix;
      if (mix) {
        item.intensity.actual = calculateIntensityFromMix(mix);
      }
    }
    return item;
  });
}

// Get National history + forecast
export async function getNationalHistoryAndForecast(from: string, to: string): Promise<ForecastData[]> {
  // Endpoint: /intensity/{from}/{to}
  const response = await fetchWithNoCache(`${BASE_URL}/intensity/${from}/${to}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch national history: ${response.status}`);
  }
  const json = await response.json();
  const data: ForecastData[] = json.data || [];
  return data;
}

// Get intensity for a specific region ID
export async function getRegionalIntensityById(regionId: number): Promise<RegionalData> {
  const response = await fetchWithNoCache(`${BASE_URL}/regional/regionid/${regionId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch regional data: ${response.status}`);
  }
  const data = await response.json();
  return data.data[0];
}

// Get national generation mix
export async function getGenerationMix(): Promise<GenerationMix[]> {
  const response = await fetchWithNoCache(`${BASE_URL}/generation`);
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
export async function getAllRegions(): Promise<RegionListItem[]> {
  const response = await fetchWithNoCache(`${BASE_URL}/regional`);
  const data = await response.json();
  return data.data[0]?.regions || [];
}

// Helper to get intensity color class
export function getIntensityColor(index: string): string {
  const colors: Record<string, string> = {
    'very low': 'bg-intensity-very-low',
    'low': 'bg-intensity-low',
    'moderate': 'bg-intensity-moderate',
    'high': 'bg-intensity-high',
    'very high': 'bg-intensity-very-high',
  };
  return colors[index] || 'bg-muted';
}

export function getIntensityTextColor(index: string): string {
  const colors: Record<string, string> = {
    'very low': 'text-intensity-very-low',
    'low': 'text-intensity-low',
    'moderate': 'text-intensity-moderate',
    'high': 'text-intensity-high',
    'very high': 'text-intensity-very-high',
  };
  return colors[index] || 'text-muted-foreground';
}

// Get fuel color
export function getFuelColor(fuel: string): string {
  const colors: Record<string, string> = {
    'wind': 'bg-gen-wind',
    'solar': 'bg-gen-solar',
    'nuclear': 'bg-gen-nuclear',
    'gas': 'bg-gen-gas',
    'coal': 'bg-gen-coal',
    'hydro': 'bg-gen-hydro',
    'biomass': 'bg-gen-biomass',
    'imports': 'bg-gen-imports',
    'other': 'bg-gen-other',
  };
  return colors[fuel.toLowerCase()] || 'bg-muted';
}

// Carbon Intensity Factors (gCO2/kWh)
export const CARBON_FACTORS: Record<string, number> = {
  biomass: 120,
  coal: 820,
  imports: 250, // Average estimate
  gas: 390,
  nuclear: 0,
  other: 300,
  hydro: 0,
  solar: 0,
  wind: 0,
};

export function calculateIntensityFromMix(mix: GenerationMix[]): number {
  if (!mix || mix.length === 0) return 0;

  let totalIntensity = 0;
  mix.forEach(source => {
    const factor = CARBON_FACTORS[source.fuel] ?? 0;
    // perc is 0-100
    totalIntensity += (source.perc / 100) * factor;
  });

  return Math.round(totalIntensity);
}