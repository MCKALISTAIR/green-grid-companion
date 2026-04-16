import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ForecastData } from '@/lib/carbonApi';
import { usePeriodicRefresh } from '@/hooks/usePeriodicRefresh';
import { useProductTour } from '@/hooks/useProductTour';

interface IndexPageEffectsOptions {
  postcode: string;
  intensity: number;
  isLoading: boolean;
  lastUpdated: string | undefined;
  forecast: ForecastData[];
  refetch: () => void;
  scheduleGreenAlerts: (forecast: ForecastData[]) => void;
  scheduleDailyForecast: (forecast: ForecastData[]) => void;
  scheduleHighIntensityAlerts: (forecast: ForecastData[]) => void;
}

export function useIndexPageEffects({
  postcode,
  intensity,
  isLoading,
  lastUpdated,
  forecast,
  refetch,
  scheduleGreenAlerts,
  scheduleDailyForecast,
  scheduleHighIntensityAlerts,
}: IndexPageEffectsOptions) {
  const navigate = useNavigate();

  // Redirect to onboarding if no postcode
  useEffect(() => {
    if (!postcode) {
      navigate('/onboarding');
    }
  }, [postcode, navigate]);

  // Auto-schedule notifications when forecast updates
  useEffect(() => {
    if (forecast && forecast.length > 0) {
      scheduleGreenAlerts(forecast);
      scheduleDailyForecast(forecast);
      scheduleHighIntensityAlerts(forecast);
    }
  }, [forecast, scheduleGreenAlerts, scheduleDailyForecast, scheduleHighIntensityAlerts]);

  // Start product tour
  const { startTour } = useProductTour();
  useEffect(() => {
    if (!isLoading && intensity) {
      startTour();
    }
  }, [isLoading, intensity, startTour]);

  // Periodic stale data refresh
  usePeriodicRefresh(lastUpdated ?? null, refetch);
}
