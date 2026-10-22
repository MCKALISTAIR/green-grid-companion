import { appStorage } from '@/lib/appStorage';
import { useQuery } from '@tanstack/react-query';
import {
  getRegionalHistoryAndForecast,
  getNationalHistoryAndForecast,
  ForecastData,
} from '@/lib/carbonApi';
import { useCarbonData } from '@/hooks/useCarbonData';
import { subYears } from 'date-fns';
import { londonDayBounds, pickedDateKey } from '@/lib/londonTime';

export function useHistoricalCarbon(date: Date | undefined) {
  const postcode = appStorage.getItem('gridgreen-postcode') || '';
  const { regionId } = useCarbonData(postcode);

  const query = useQuery<ForecastData[]>({
    queryKey: ['historical', regionId, date?.toISOString()],
    queryFn: async ({ signal }) => {
      if (!date) return [];

      // BH-68: the picked calendar day is a UK day (London midnight to midnight),
      // whatever zone the phone is in. 23 or 25 hours on clock-change days.
      const bounds = londonDayBounds(pickedDateKey(date));
      const from = bounds.from.toISOString();
      const to = bounds.to.toISOString();

      if (regionId) {
        return getRegionalHistoryAndForecast(regionId, from, to, signal);
      } else {
        return getNationalHistoryAndForecast(from, to, signal);
      }
    },
    enabled: !!date,
    staleTime: Infinity, // History doesn't change
    gcTime: 1000 * 60 * 60 * 24, // Keep for 24 hours
  });

  const comparisonQuery = useQuery<ForecastData[]>({
    queryKey: ['historical_comparison', regionId, date?.toISOString()],
    queryFn: async ({ signal }) => {
      if (!date) return [];

      // Compare with 1 year prior to the selected date
      // or if selected date is today, 1 year ago from today
      const compareDate = subYears(date, 1);
      const bounds = londonDayBounds(pickedDateKey(compareDate));
      const from = bounds.from.toISOString();
      const to = bounds.to.toISOString();

      if (regionId) {
        return getRegionalHistoryAndForecast(regionId, from, to, signal);
      } else {
        return getNationalHistoryAndForecast(from, to, signal);
      }
    },
    enabled: !!date,
    staleTime: Infinity,
  });

  return {
    data: query.data || [],
    comparisonData: comparisonQuery.data || [],
    isLoading: query.isLoading || comparisonQuery.isLoading,
    isError: query.isError || comparisonQuery.isError,
    error: query.error || comparisonQuery.error,
  };
}
