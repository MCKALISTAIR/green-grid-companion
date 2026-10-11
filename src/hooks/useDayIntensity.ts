import { useQuery } from '@tanstack/react-query';
import { getIntensityRange, type ForecastData } from '@/lib/carbonApi';
import { londonDayBounds } from '@/lib/dayForecast';

/** Fetch one whole London day (forecast for regions, forecast + actual for GB). */
export function useDayIntensity(
  dateKey: string | null,
  regionId: number | null | undefined,
  placeholder?: ForecastData[],
) {
  const id = regionId || 0;
  return useQuery<ForecastData[]>({
    queryKey: ['day-detail', id, dateKey],
    enabled: !!dateKey,
    queryFn: ({ signal }) => {
      const { start, end } = londonDayBounds(dateKey!);
      // NESO returns the slot that ends at `from` too; buildDayDetail drops it.
      return getIntensityRange(id, new Date(start).toISOString(), new Date(end).toISOString(), signal);
    },
    placeholderData: placeholder && placeholder.length ? placeholder : undefined,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });
}

