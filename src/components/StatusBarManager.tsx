import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { useCarbonData } from '@/hooks/useCarbonData';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { useSceneDirector } from '@/hooks/useSceneDirector';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useTheme } from '@/components/ThemeProvider';
import { getSkyTopColor, getCarbonIndex } from '@/lib/sceneUtils';
import { logger } from '@/lib/logger';

export function StatusBarManager() {
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const { intensity: realIntensity } = useCarbonData('');
  const { timeOfDay: realTimeOfDay, isNight: realIsNight } = useTimeOfDay();
  const { weather: realWeather } = useWeatherData();
  const { active: isDirectorMode, overrides } = useSceneDirector();

  // Compute overrides similarly to IntensityScene to ensure matching
  const timeOfDay = isDirectorMode && overrides.timeOfDay ? overrides.timeOfDay : realTimeOfDay;
  const isNight =
    isDirectorMode && overrides.timeOfDay
      ? ['night', 'dusk', 'dawn'].includes(overrides.timeOfDay)
      : realIsNight;

  const intensity =
    isDirectorMode && overrides.intensity !== undefined ? overrides.intensity : realIntensity;

  const weather =
    isDirectorMode && overrides.weather ? { ...realWeather, ...overrides.weather } : realWeather;

  // Determine effective index string based on intensity
  const index = getCarbonIndex(intensity);

  // Compute sky top color to match the scene background
  // We use cleanliness derived from intensity
  const cleanliness = Math.max(0, Math.min(1, 1 - (intensity - 50) / 300));
  const skyColor = getSkyTopColor(index, timeOfDay, cleanliness, weather);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const applyStatusBar = async () => {
      try {
        if (location.pathname === '/') {
          await StatusBar.setBackgroundColor({ color: skyColor });
          await StatusBar.setStyle({ style: isNight ? Style.Dark : Style.Light });
        } else {
          // resolvedTheme already tracks OS-forced light/dark when preference is system
          const isDark = resolvedTheme === 'dark';
          const bgColor = isDark ? '#131820' : '#f1f7f9';
          await StatusBar.setBackgroundColor({ color: bgColor });
          // Style.Dark = light content (for dark backgrounds); Style.Light = dark content
          await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
        }
      } catch (e) {
        logger.error('Failed to set status bar:', e);
      }
    };

    applyStatusBar();
  }, [location.pathname, skyColor, isNight, resolvedTheme]);

  return null;
}
