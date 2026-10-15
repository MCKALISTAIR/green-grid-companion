import { useQuery } from '@tanstack/react-query';
import {
  getRegionalHistoryAndForecast,
  getNationalHistoryAndForecast,
  ForecastData,
} from '@/lib/carbonApi';
import { useCarbonData } from '@/hooks/useCarbonData';
import { addDays, endOfDay, formatISO, startOfDay, subYears } from 'date-fns';

export function useHistoricalCarbon(date: Date | undefined) {
  const postcode = localStorage.getItem('gridgreen-postcode') || '';
  const { regionId } = useCarbonData(postcode);

  const query = useQuery<ForecastData[]>({
    queryKey: ['historical', regionId, date?.toISOString()],
    queryFn: async ({ signal }) => {
      if (!date) return [];

      // Format dates for API: YYYY-MM-DDThh:mmZ
      // We want the full 24h of the selected day
      const from = startOfDay(date).toISOString();
      const to = endOfDay(date).toISOString();

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
      const from = startOfDay(compareDate).toISOString();
      const to = endOfDay(compareDate).toISOString();

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
