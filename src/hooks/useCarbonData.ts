import { useQuery, useQueryClient, useIsRestoring } from '@tanstack/react-query';
import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import {
  getRegionalForecastById,
  getRegionalHistoryAndForecast,
  getNationalHistoryAndForecast,
  getRegionalIntensityById,
  getRegionalIntensity,
  getGenerationMix,
  getCurrentIntensity,
  getAllRegions,
  pickLiveIntensity,
  RegionalData,
  RegionListItem,
  ForecastData,
  GenerationMix,
  IntensityData,
  REGION_IDS,
} from '@/lib/carbonApi';
import { logger } from '@/lib/logger';
import { offGridArea } from '@/lib/postcode';
import { regionNameForPostcode } from '@/lib/regionMatch';

// Calculate ms until next half-hour boundary (:00 or :30)
// NESO updates at these times, so we align our refreshes
const getMsUntilNextHalfHour = (): number => {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ms = now.getMilliseconds();

  // Calculate minutes until next :00 or :30
  const minutesToNext = minutes < 30 ? 30 - minutes : 60 - minutes;
  // Convert to ms, add 90 second buffer for API processing delay
  return (minutesToNext * 60 - seconds) * 1000 - ms + 90000;
};

// Global singleton for smart refetch — ensures only one timer exists
// even if multiple useCarbonData instances are active
let globalRefetchTimer: ReturnType<typeof setTimeout> | null = null;
let globalRefetchFn: (() => Promise<void>) | null = null;
let globalRefetchSubscribers = 0;

function useSmartRefetch(refetchFn: () => Promise<void>, enabled: boolean) {
  const refetchRef = useRef(refetchFn);
  refetchRef.current = refetchFn;

  useEffect(() => {
    if (!enabled) return;

    // Register this instance's refetch as the global one
    globalRefetchFn = () => refetchRef.current();
    globalRefetchSubscribers++;

    // Only start the timer if we're the first subscriber
    if (globalRefetchSubscribers === 1) {
      const scheduleNext = () => {
        if (globalRefetchTimer) {
          clearTimeout(globalRefetchTimer);
        }

        const msUntilNext = getMsUntilNextHalfHour();
        logger.debug(`Next carbon data fetch scheduled in ${Math.round(msUntilNext / 1000)}s`);

        globalRefetchTimer = setTimeout(async () => {
          logger.info('Smart refetch triggered at half-hour boundary');
          try {
            if (globalRefetchFn) await globalRefetchFn();
          } catch (e) {
            logger.warn('Smart refetch failed', e);
          }
          scheduleNext();
        }, msUntilNext);
      };

      scheduleNext();
    }

    return () => {
      globalRefetchSubscribers--;
      if (globalRefetchSubscribers === 0 && globalRefetchTimer) {
        clearTimeout(globalRefetchTimer);
        globalRefetchTimer = null;
        globalRefetchFn = null;
      }
    };
  }, [enabled]);
}

export function useCarbonData(postcode: string) {
  const queryClient = useQueryClient();
  // PersistQueryClient rehydrates async: before restore finishes, queries look
  // idle with no data (isLoading=false). Treat that window as loading so Index
  // doesn't flash ErrorState and shift the feed (CLS).
  const isRestoring = useIsRestoring();

  // Track previous intensity for animation
  const [previousIntensity, setPreviousIntensity] = useState<number | null>(null);
  const lastIntensityRef = useRef<number | null>(null);

  // National intensity as fallback
  const nationalQuery = useQuery<IntensityData>({
    queryKey: ['national'],
    queryFn: ({ signal }) => getCurrentIntensity(signal),
    staleTime: 1000 * 60 * 10, // 10 minutes - more aggressive staleness
    gcTime: 1000 * 60 * 60, // 1 hour
    // No refetchInterval - we use smart setTimeout instead
  });

  const regionalListQuery = useQuery<RegionListItem[]>({
    queryKey: ['regional', 'all'],
    queryFn: ({ signal }) => getAllRegions(signal),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  // Find matching region in API data first
  // Normalize strings to handle potential differences (e.g. & vs and)
  const normalize = (s?: string) =>
    (s || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]/g, '');

  // Find region by matching postcode prefix (e.g. "EH1..." matches "EH")
  // We sort by length descending to ensure "BS" matches "BS" before "B" matches "B" (if both existed and overlapped)
  const targetRegionName = regionNameForPostcode(postcode);

  const foundRegion = regionalListQuery.data?.find((r) => {
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

  logger.debug('useCarbonData resolution', {
    postcode,
    targetRegionName,
    foundRegionShortname: foundRegion?.shortname,
    regionId,
  });

  // Fetch detailed regional data by ID (avoids CORS issues with postcode endpoint)
  const regionalDataQuery = useQuery<RegionalData | null>({
    queryKey: ['regional', regionId],
    queryFn: ({ signal }) =>
      regionId ? getRegionalIntensityById(regionId, signal) : Promise.resolve(null),
    enabled: !!regionId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
    // No refetchInterval - we use smart setTimeout instead
  });

  // NI, Channel Islands, Isle of Man, BFPO: not on the GB grid. Show the GB
  // average, flagged, and never ask NESO (its lookup put GY1 in South Scotland).
  const offGrid = offGridArea(postcode);
  if (offGrid) regionId = undefined;

  const isLocalRegionResolvable =
    !!offGrid ||
    postcode === 'GB' ||
    postcode === 'Scotland' ||
    postcode === 'England' ||
    postcode === 'Wales' ||
    !!targetRegionName;

  // START FALLBACK: If we couldn't resolve regionId locally, maybe we can get it from the API directly?
  // We can try to fetch the specific postcode data which INCLUDES the regionid.
  const postcodeQuery = useQuery<RegionalData>({
    queryKey: ['regional', postcode],
    queryFn: ({ signal }) => getRegionalIntensity(postcode, signal),
    enabled: !!postcode && !isLocalRegionResolvable && !regionId, // Only run if we failed to resolve ID locally
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  // If local resolution failed, try to use the ID from the direct postcode lookup
  if (!regionId && postcodeQuery.data?.regionid) {
    regionId = postcodeQuery.data.regionid;
  }

  const isPostcodeResolved =
    isLocalRegionResolvable ||
    !!regionId ||
    postcodeQuery.isError ||
    (!postcodeQuery.isLoading && postcodeQuery.isFetched);

  const forecastQuery = useQuery<ForecastData[]>({
    queryKey: ['forecast', regionId, postcode],
    queryFn: ({ signal }) => {
      const now = new Date();
      // 24 hours ago
      const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      // 48 hours in future (API limit usually)
      const to = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

      if (postcode === 'GB' || regionId === 0 || !regionId) {
        // If no specific region, fetch the National forecast which will always succeed.
        return getNationalHistoryAndForecast(from, to, signal);
      }
      return getRegionalHistoryAndForecast(regionId, from, to, signal);
    },
    enabled: isPostcodeResolved, // Wait for postcode resolution if needed
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
  });

  const generationQuery = useQuery<GenerationMix[]>({
    queryKey: ['generation'],
    queryFn: ({ signal }) => getGenerationMix(signal),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    // No refetchInterval - we use smart setTimeout instead
  });

  // Stable refetch — use refs to avoid re-creating this on every render
  const nationalRefetch = nationalQuery.refetch;
  const regionalListRefetch = regionalListQuery.refetch;
  const regionalDataRefetch = regionalDataQuery.refetch;
  const forecastRefetch = forecastQuery.refetch;
  const generationRefetch = generationQuery.refetch;

  const refetch = useCallback(async () => {
    await Promise.all([
      nationalRefetch(),
      regionalListRefetch(),
      regionalDataRefetch(),
      forecastRefetch(),
      generationRefetch(),
    ]);
  }, [
    nationalRefetch,
    regionalListRefetch,
    regionalDataRefetch,
    forecastRefetch,
    generationRefetch,
  ]);

  // Use smart refetch aligned to grid schedule
  useSmartRefetch(refetch, !!postcode);

  // Extract data from specific regional query or fallback to national
  const regionalData = regionalDataQuery.data?.data?.[0];

  // Prefer NESO actual when published for the open half-hour; else forecast.
  // Regional endpoints usually have forecast only. `intensity` is 0 only when
  // there is no reading yet (hasReading = false); isLoading/isError cover that
  // so the UI never shows 0 / 'moderate' as if it were real.
  const liveIntensity =
    pickLiveIntensity(regionalData?.intensity) ?? pickLiveIntensity(nationalQuery.data?.intensity);
  const hasReading = liveIntensity !== null;
  const intensity = hasReading ? liveIntensity : 0;
  const index =
    regionalData?.intensity?.index ?? nationalQuery.data?.intensity?.index ?? 'moderate';

  // Track intensity changes for animation
  useEffect(() => {
    if (intensity !== 0 && intensity !== lastIntensityRef.current) {
      setPreviousIntensity(lastIntensityRef.current);
      lastIntensityRef.current = intensity;
    }
  }, [intensity]);

  // Use the name from the found region metadata (from list) or fallback
  // If regional data failed to load, explicit fallback to "National"
  const region =
    regionalDataQuery.data?.shortname ??
    postcodeQuery.data?.shortname ??
    foundRegion?.shortname ??
    (nationalQuery.data ? 'National' : '');

  // Generation mix from regional or national
  const generationMix = regionalData?.generationmix ?? generationQuery.data ?? [];

  // Determine if this is an initial load (no data yet) vs background refetch
  const isInitialLoad = postcode
    ? regionalListQuery.isLoading ||
      (!!regionId &&
        !regionalDataQuery.data &&
        (regionalDataQuery.isLoading || regionalDataQuery.isFetching))
    : !nationalQuery.data && (nationalQuery.isLoading || nationalQuery.isFetching);

  // isLoading should only be true on initial load, not during background refetches.
  // Also stay loading while there's no reading but a query is still on its way
  // (e.g. postcode lookup or national fallback still pending), including the
  // one-frame gap after regionId resolves before regionalData reports isLoading.
  const awaitingReading =
    !hasReading &&
    (isRestoring ||
      nationalQuery.isLoading ||
      nationalQuery.isFetching ||
      regionalListQuery.isLoading ||
      regionalListQuery.isFetching ||
      postcodeQuery.isLoading ||
      postcodeQuery.isFetching ||
      regionalDataQuery.isLoading ||
      regionalDataQuery.isFetching ||
      (!!regionId && !regionalDataQuery.data && !regionalDataQuery.isError));
  const isLoading = isRestoring || isInitialLoad || awaitingReading;

  // Only treat "no reading" as an error once the national (fallback) query has
  // actually settled — not while the persist cache is still rehydrating.
  const noReadingSettled =
    !hasReading && !isLoading && nationalQuery.isFetched && !nationalQuery.isFetching;

  // Client fetch time (not the API half-hour `from`) — used by Settings "Last checked".
  const lastCheckedMs = Math.max(
    nationalQuery.dataUpdatedAt,
    regionalListQuery.dataUpdatedAt,
    regionalDataQuery.dataUpdatedAt,
    forecastQuery.dataUpdatedAt,
    generationQuery.dataUpdatedAt,
  );

  return {
    // Current intensity
    intensity,
    /** False when `intensity` is only the 0 placeholder (no real reading yet). */
    hasReading,
    previousIntensity,
    index,
    region,
    regionId, // Export regionId for use in other hooks/pages
    // Half-hour period start from the API reading (for staleness / next update).
    lastUpdated: regionalData?.from || nationalQuery.data?.from,

    // When the client last successfully fetched grid data (updates on Force Refresh
    // even if the half-hour reading itself has not changed yet).
    lastCheckedAt: lastCheckedMs > 0 ? new Date(lastCheckedMs).toISOString() : undefined,

    // Generation mix
    generationMix,

    // Forecast
    forecast: forecastQuery.data ?? [],

    // Loading states - only true on initial load, not background refetches
    isLoading,

    // Flag for background fetching (data exists but refreshing)
    isBackgroundFetching:
      !isRestoring &&
      !isInitialLoad &&
      (nationalQuery.isFetching || regionalDataQuery.isFetching || forecastQuery.isFetching),

    // Robustness: Only report error if we have NO data to show.
    // If Regional fails but National is okay, we show National (graceful degradation).
    // Also an error if everything has settled and there's still no reading to show.
    isError:
      (postcode
        ? (regionalListQuery.isError || regionalDataQuery.isError) && nationalQuery.isError
        : nationalQuery.isError) || noReadingSettled,

    // NESO couldn't place this postcode at all (e.g. a made-up one): the numbers
    // shown are the GB average and the UI must say so, never switch silently.
    postcodeNotFound: !!postcode && !offGrid && !isLocalRegionResolvable && postcodeQuery.isError,
    /** Set when the saved postcode is not on the GB grid; figures are the GB average. */
    offGridArea: offGrid,

    // Flag to explicitly identify graceful degradation so UI can warn the user
    isDegraded:
      !!postcode &&
      (regionalDataQuery.isError || regionalListQuery.isError) &&
      !nationalQuery.isError,

    error:
      postcode && nationalQuery.isError
        ? regionalDataQuery.error || nationalQuery.error
        : nationalQuery.error,

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
    },
  };
}
