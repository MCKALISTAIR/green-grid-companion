import { useQuery } from '@tanstack/react-query';
import {
  getRegionalForecastById,
  getRegionalHistoryAndForecast,
  getRegionalIntensityById,
  getGenerationMix,
  getCurrentIntensity,
  getAllRegions,
  UK_REGIONS,
  RegionalData,
  RegionListItem,
  ForecastData,
  GenerationMix,
  IntensityData
} from '@/lib/carbonApi';

export function useCarbonData(postcode: string) {
  // National intensity as fallback
  const nationalQuery = useQuery<IntensityData>({
    queryKey: ['national'],
    queryFn: getCurrentIntensity,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const regionalListQuery = useQuery<RegionListItem[]>({
    queryKey: ['regional', 'all'],
    queryFn: getAllRegions,
    refetchInterval: 1000 * 60 * 5, // Check every 5 minutes
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  // Find matching region in API data first
  // Normalize strings to handle potential differences (e.g. & vs and)
  const normalize = (s?: string) => (s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

  // Find region by matching postcode prefix (e.g. "EH1..." matches "EH")
  // We sort by length descending to ensure "BS" matches "BS" before "B" matches "B" (if both existed and overlapped)
  const targetRegionName = UK_REGIONS
    .filter(r => postcode.toUpperCase().startsWith(r.postcode))
    .sort((a, b) => b.postcode.length - a.postcode.length)[0]?.name;


  const foundRegion = regionalListQuery.data?.find(r => {
    if (!targetRegionName) return false;
    const target = normalize(targetRegionName);
    return normalize(r.shortname) === target || normalize(r.dnoregion) === target;
  });

  // Handle aggregate regions explicitly since they might not be in the /regional list
  let regionId = foundRegion?.regionid;
  if (!regionId) {
    if (postcode === 'Scotland') regionId = 16;
    if (postcode === 'England') regionId = 15;
    if (postcode === 'Wales') regionId = 17;
    // GB/National falls through to undefined, handled by fallback
  }

  // Fetch detailed regional data by ID (avoids CORS issues with postcode endpoint)
  // Fetch detailed regional data by ID (avoids CORS issues with postcode endpoint)
  const regionalDataQuery = useQuery<RegionalData | null>({
    queryKey: ['regional', regionId],
    queryFn: () => regionId ? getRegionalIntensityById(regionId) : Promise.resolve(null),
    enabled: !!regionId,
    refetchInterval: 30000,
    retry: 2,
  });

  const forecastQuery = useQuery<ForecastData[]>({
    queryKey: ['forecast', regionId],
    queryFn: () => {
      if (!regionId) return Promise.resolve([]);
      const now = new Date();
      // 24 hours ago
      const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      // 48 hours in future (API limit usually)
      const to = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
      return getRegionalHistoryAndForecast(regionId, from, to);
    },
    enabled: !!regionId,
    refetchInterval: 60000 * 5,
    staleTime: 60000 * 2,
    retry: 2,
  });

  const generationQuery = useQuery<GenerationMix[]>({
    queryKey: ['generation'],
    queryFn: getGenerationMix,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // Extract data from specific regional query or fallback to national
  const regionalData = regionalDataQuery.data?.data?.[0];

  // Use regional data if available, otherwise national
  const intensity = regionalData?.intensity?.forecast
    ?? nationalQuery.data?.intensity?.forecast
    ?? 0;
  const index = regionalData?.intensity?.index
    ?? nationalQuery.data?.intensity?.index
    ?? 'moderate';
  // Use the name from the found region metadata (from list) or fallback
  const region = foundRegion?.shortname
    ?? (nationalQuery.data ? 'National Grid' : '');

  // Generation mix from regional or national
  const generationMix = regionalData?.generationmix ?? generationQuery.data ?? [];

  return {
    // Current intensity
    intensity,
    index,
    region,
    regionId, // Export regionId for use in other hooks/pages
    lastUpdated: regionalData?.from || nationalQuery.data?.from,

    // Generation mix
    generationMix,

    // Forecast
    forecast: forecastQuery.data ?? [],

    // Loading states - show loading if the requested data is loading
    // If postcode is provided, we wait for regional list. 
    // If found, we wait for specific data and forecast.
    isLoading: postcode ? (
      regionalListQuery.isLoading ||
      (!!regionId && (regionalDataQuery.isLoading || forecastQuery.isLoading))
    ) : nationalQuery.isLoading,

    isError: postcode ? (regionalListQuery.isError || regionalDataQuery.isError) : nationalQuery.isError,
    error: regionalListQuery.error ?? regionalDataQuery.error ?? nationalQuery.error,

    // Refetch
    refetch: async () => {
      await Promise.all([
        nationalQuery.refetch(),
        regionalListQuery.refetch(),
        regionalDataQuery.refetch(),
        forecastQuery.refetch(),
        generationQuery.refetch(),
      ]);
    },

    // Helper to calculate next expected update time (HH:00 or HH:30)
    getNextUpdate: (lastUpdatedStr?: string) => {
      if (!lastUpdatedStr) return null;
      const last = new Date(lastUpdatedStr);
      // Add 30 minutes to the 'from' time of the current period
      const next = new Date(last.getTime() + 30 * 60000);
      return next;
    }
  };
}