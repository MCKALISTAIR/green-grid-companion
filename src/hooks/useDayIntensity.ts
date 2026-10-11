import { useQuery } from '@tanstack/react-query';
import { getNationalHistoryAndForecast, getRegionalHistoryAndForecast, type ForecastData } from '@/lib/carbonApi';
import { londonDayBounds } from '@/lib/dayForecast';

/**
 * One whole London day: GB gets NESO forecast + actual; regions get forecast
 * plus GridSense's Est for ended half hours (backfilled in carbonApi).
 */
export function useDayIntensity(dateKey: string | null, regionId: number | null | undefined, placeholder?: ForecastData[]) {
  const id = regionId || 0;
  return useQuery<ForecastData[]>({
    queryKey: ['day-detail', id, dateKey],
    enabled: !!dateKey,
    queryFn: ({ signal }) => {
      const { start, end } = londonDayBounds(dateKey!);
      const from = new Date(start).toISOString();
      const to = new Date(end).toISOString();
      return id ? getRegionalHistoryAndForecast(id, from, to, signal) : getNationalHistoryAndForecast(from, to, signal);
    },
    placeholderData: placeholder && placeholder.length ? placeholder : undefined,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });
}
