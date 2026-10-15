import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useSceneDirector } from '@/hooks/useSceneDirector';
import { getSkyTopColor, getCarbonIndex } from '@/lib/sceneUtils';

export function useEnvironmentalConditions(postcode: string | null, intensity: number | null) {
  const { timeOfDay: realTimeOfDay } = useTimeOfDay();
  const { weather: realWeather } = useWeatherData(postcode);
  const { active: isDirectorMode, overrides } = useSceneDirector();

  // Compute overrides
  const timeOfDay = isDirectorMode && overrides.timeOfDay ? overrides.timeOfDay : realTimeOfDay;

  const derivedIntensity =
    isDirectorMode && overrides.intensity !== undefined ? overrides.intensity : intensity || 0;

  const weather =
    isDirectorMode && overrides.weather ? { ...realWeather, ...overrides.weather } : realWeather;

  // Derive cleanliness from intensity (reused formula)
  const cleanliness = Math.max(0, Math.min(1, 1 - (derivedIntensity - 50) / 300));

  // Use the effective intensity for the effective index string
  const effectiveIndex = getCarbonIndex(derivedIntensity);

  const skyColor = getSkyTopColor(effectiveIndex, timeOfDay, cleanliness, weather);

  return { skyColor };
}
