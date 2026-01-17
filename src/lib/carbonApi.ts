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
}

export const UK_REGIONS = [
  { name: 'North Scotland', postcode: 'AB' },
  { name: 'South Scotland', postcode: 'EH' },
  { name: 'North West England', postcode: 'M' },
  { name: 'North East England', postcode: 'NE' },
  { name: 'Yorkshire', postcode: 'LS' },
  { name: 'North Wales & Merseyside', postcode: 'LL' },
  { name: 'South Wales', postcode: 'CF' },
  { name: 'West Midlands', postcode: 'B' },
  { name: 'East Midlands', postcode: 'NG' },
  { name: 'East England', postcode: 'CB' },
  { name: 'South West England', postcode: 'BS' },
  { name: 'South England', postcode: 'SO' },
  { name: 'London', postcode: 'SW' },
  { name: 'South East England', postcode: 'BN' },
];

// Helper for cache busting
const fetchWithNoCache = async (url: string) => {
  const separator = url.includes('?') ? '&' : '?';
  const response = await fetch(`${url}${separator}_t=${new Date().getTime()}`);
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
  // Response: { data: { regionid, ... data: [] } }
  return json.data?.data || [];
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