import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSavedLocations } from '@/hooks/useSavedLocations';
import { getRegionalIntensityById, getRegionalHistoryAndForecast } from '@/lib/carbonApi';
import { logger } from '@/lib/logger';
import { regionNameForPostcode } from '@/lib/regionMatch';

export function useSmartPrefetch() {
  const queryClient = useQueryClient();
  const { savedLocations } = useSavedLocations();

  useEffect(() => {
    // Only run if we have window and requestIdleCallback (or a fallback)
    if (typeof window === 'undefined') return;

    const prefetchData = async () => {
      if (savedLocations.length === 0) return;

      logger.info(`Smart Prefetch: Queuing prefetch for ${savedLocations.length} saved locations`);

      // We want to prefetch regional intensity and forecast for each saved location
      for (const loc of savedLocations) {
        // Find regionId for this location's postcode
        const targetRegionName = regionNameForPostcode(loc.postcode);

        // Assuming we rely on the same ID logic,
        // we might not have the regional list here unless it's cached.
        // But we can fallback to just running the prefetch if we have the ID.
        // Actually, without the regional list, mapping postcode to regionId is tricky.
        // Let's rely on the direct postcode fetch if regionId isn't immediately known.

        // Let's prefetch the direct postcode query which caches the ID
        // and provides the current intensity.
        queryClient
          .prefetchQuery({
            queryKey: ['regional', loc.postcode],
            queryFn: async ({ signal }) => {
              // In actual use, getRegionalIntensity(postcode) is used.
              // We can dynamically import it to avoid circular depends if necessary.
              const { getRegionalIntensity } = await import('@/lib/carbonApi');
              return getRegionalIntensity(loc.postcode, signal);
            },
            staleTime: 1000 * 60 * 30,
          })
          .then(() => {
            // If we successfully prefetched the postcode, the cache now holds it!
            // If we want to be thorough, we could extract the regionId from the cache and prefetch forecast.
          });
      }
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => prefetchData(), { timeout: 2000 });
    } else {
      setTimeout(prefetchData, 2000);
    }
  }, [savedLocations, queryClient]);
}
