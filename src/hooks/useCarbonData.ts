import { useQuery } from '@tanstack/react-query';
import { 
  getRegionalIntensity, 
  getRegionalForecast, 
  getGenerationMix,
  getCurrentIntensity,
  RegionalData,
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

  const regionalQuery = useQuery<RegionalData>({
    queryKey: ['regional', postcode],
    queryFn: () => getRegionalIntensity(postcode),
    refetchInterval: 30000,
    staleTime: 15000,
    retry: 2,
  });

  const forecastQuery = useQuery<ForecastData[]>({
    queryKey: ['forecast', postcode],
    queryFn: () => getRegionalForecast(postcode),
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

  // Extract data from regional or fallback to national
  const regionalData = regionalQuery.data?.data?.[0];
  
  // Use regional data if available, otherwise national
  const intensity = regionalData?.intensity?.forecast 
    ?? nationalQuery.data?.intensity?.forecast 
    ?? 0;
  const index = regionalData?.intensity?.index 
    ?? nationalQuery.data?.intensity?.index 
    ?? 'moderate';
  const region = regionalQuery.data?.shortname 
    ?? (nationalQuery.data ? 'National Grid' : '');

  // Generation mix from regional or national
  const generationMix = regionalData?.generationmix ?? generationQuery.data ?? [];

  return {
    // Current intensity
    intensity,
    index,
    region,
    
    // Generation mix
    generationMix,
    
    // Forecast
    forecast: forecastQuery.data ?? [],
    
    // Loading states - only show loading if all primary queries are loading
    isLoading: (regionalQuery.isLoading && nationalQuery.isLoading),
    isError: regionalQuery.isError && nationalQuery.isError,
    error: regionalQuery.error ?? nationalQuery.error,
    
    // Refetch
    refetch: () => {
      nationalQuery.refetch();
      regionalQuery.refetch();
      forecastQuery.refetch();
      generationQuery.refetch();
    },
  };
}