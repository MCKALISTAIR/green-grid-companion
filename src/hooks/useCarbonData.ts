import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
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
  IntensityData,
  REGION_IDS
} from '@/lib/carbonApi';
import { logger } from '@/lib/logger';

// Calculate ms until next half-hour boundary (:00 or :30)
// National Grid updates at these times, so we align our refreshes
const getMsUntilNextHalfHour = (): number => {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ms = now.getMilliseconds();

  // Calculate minutes until next :00 or :30
  const minutesToNext = minutes < 30 ? (30 - minutes) : (60 - minutes);
  // Convert to ms, add 90 second buffer for API processing delay
  return ((minutesToNext * 60) - seconds) * 1000 - ms + 90000;
};

// Hook for precise setTimeout-based refetching aligned to grid schedule
function useSmartRefetch(refetchFn: () => Promise<void>, enabled: boolean) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleNextFetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const msUntilNext = getMsUntilNextHalfHour();
    logger.debug(`Next carbon data fetch scheduled in ${Math.round(msUntilNext / 1000)}s`);

    timeoutRef.current = setTimeout(async () => {
      logger.info('Smart refetch triggered at half-hour boundary');
      await refetchFn();
      // Schedule the next fetch after this one completes
      scheduleNextFetch();
    }, msUntilNext);
  }, [refetchFn]);

  useEffect(() => {
    if (!enabled) return;

    // Schedule initial fetch
    scheduleNextFetch();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, scheduleNextFetch]);
}

export function useCarbonData(postcode: string) {
  const queryClient = useQueryClient();

  // Track previous intensity for animation
  const [previousIntensity, setPreviousIntensity] = useState<number | null>(null);
  const lastIntensityRef = useRef<number | null>(null);

  // National intensity as fallback
  const nationalQuery = useQuery<IntensityData>({
    queryKey: ['national'],
    queryFn: getCurrentIntensity,
    staleTime: 1000 * 60 * 10, // 10 minutes - more aggressive staleness
    gcTime: 1000 * 60 * 60, // 1 hour
    // No refetchInterval - we use smart setTimeout instead
  });

  const regionalListQuery = useQuery<RegionListItem[]>({
    queryKey: ['regional', 'all'],
    queryFn: getAllRegions,
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
    if (postcode === 'Scotland') regionId = REGION_IDS.SCOTLAND;
    if (postcode === 'England') regionId = REGION_IDS.ENGLAND;
    if (postcode === 'Wales') regionId = REGION_IDS.WALES;
    // GB/National falls through to undefined, handled by fallback
  }

  logger.info('useCarbonData resolution', {
    postcode,
    targetRegionName,
    foundRegionShortname: foundRegion?.shortname,
    regionId
  });

  // Fetch detailed regional data by ID (avoids CORS issues with postcode endpoint)
  const regionalDataQuery = useQuery<RegionalData | null>({
    queryKey: ['regional', regionId],
    queryFn: () => regionId ? getRegionalIntensityById(regionId) : Promise.resolve(null),
    enabled: !!regionId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
    // No refetchInterval - we use smart setTimeout instead
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
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
  });

  // START FALLBACK: If we couldn't resolve regionId locally, maybe we can get it from the API directly?
  // We can try to fetch the specific postcode data which INCLUDES the regionid.
  const postcodeQuery = useQuery<RegionalData>({
    queryKey: ['regional', postcode],
    queryFn: () => getRegionalIntensity(postcode),
    enabled: !!postcode && !regionId, // Only run if we failed to resolve ID locally
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  // If local resolution failed, try to use the ID from the direct postcode lookup
  if (!regionId && postcodeQuery.data?.regionid) {
    regionId = postcodeQuery.data.regionid;
  }

  const generationQuery = useQuery<GenerationMix[]>({
    queryKey: ['generation'],
    queryFn: getGenerationMix,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    // No refetchInterval - we use smart setTimeout instead
  });

  // Refetch function for smart scheduling
  const refetch = useCallback(async () => {
    await Promise.all([
      nationalQuery.refetch(),
      regionalListQuery.refetch(),
      regionalDataQuery.refetch(),
      forecastQuery.refetch(),
      generationQuery.refetch(),
    ]);
  }, [nationalQuery, regionalListQuery, regionalDataQuery, forecastQuery, generationQuery]);

  // Use smart refetch aligned to grid schedule
  useSmartRefetch(refetch, !!postcode);

  // Extract data from specific regional query or fallback to national
  const regionalData = regionalDataQuery.data?.data?.[0];

  // Use regional data if available, otherwise national
  const intensity = regionalData?.intensity?.forecast
    ?? nationalQuery.data?.intensity?.forecast
    ?? 0;
  const index = regionalData?.intensity?.index
    ?? nationalQuery.data?.intensity?.index
    ?? 'moderate';

  // Track intensity changes for animation
  useEffect(() => {
    if (intensity !== 0 && intensity !== lastIntensityRef.current) {
      setPreviousIntensity(lastIntensityRef.current);
      lastIntensityRef.current = intensity;
    }
  }, [intensity]);

  // Use the name from the found region metadata (from list) or fallback
  // If regional data failed to load, explicit fallback to "National"
  const region = (regionalDataQuery.isSuccess && foundRegion?.shortname)
    ? foundRegion.shortname
    : (nationalQuery.data ? 'National Grid' : '');

  // Generation mix from regional or national
  const generationMix = regionalData?.generationmix ?? generationQuery.data ?? [];

  // Determine if this is an initial load (no data yet) vs background refetch
  const isInitialLoad = postcode ? (
    regionalListQuery.isLoading ||
    (!!regionId && !regionalDataQuery.data && regionalDataQuery.isLoading)
  ) : (!nationalQuery.data && nationalQuery.isLoading);

  // isLoading should only be true on initial load, not during background refetches
  const isLoading = isInitialLoad;

  return {
    // Current intensity
    intensity,
    previousIntensity,
    index,
    region,
    regionId, // Export regionId for use in other hooks/pages
    lastUpdated: regionalData?.from || nationalQuery.data?.from,

    // Generation mix
    generationMix,

    // Forecast
    forecast: forecastQuery.data ?? [],

    // Loading states - only true on initial load, not background refetches
    isLoading,

    // Flag for background fetching (data exists but refreshing)
    isBackgroundFetching: !isInitialLoad && (
      nationalQuery.isFetching ||
      regionalDataQuery.isFetching ||
      forecastQuery.isFetching
    ),

    // Robustness: Only report error if we have NO data to show.
    // If Regional fails but National is okay, we show National (graceful degradation).
    isError: postcode
      ? ((regionalListQuery.isError || regionalDataQuery.isError) && nationalQuery.isError)
      : nationalQuery.isError,

    error: (postcode && nationalQuery.isError) ? (regionalDataQuery.error || nationalQuery.error) : nationalQuery.error,

    // Next expected update from API data (valid until)
    nextUpdate: regionalData?.to || nationalQuery.data?.to,

    // Refetch
    refetch,

    // Helper to calculate next expected update time (HH:00 or HH:30)
    // kept for fallback if needed, but UI should prefer nextUpdate above
    getNextUpdate: (lastUpdatedStr?: string) => {
      if (!lastUpdatedStr) return null;
      const last = new Date(lastUpdatedStr);
      // Add 30 minutes to the 'from' time of the current period
      const next = new Date(last.getTime() + 30 * 60000);
      return next;
    }
  };
}