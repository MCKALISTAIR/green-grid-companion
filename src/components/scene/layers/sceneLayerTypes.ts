import type { MotionValue } from 'framer-motion';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { WeatherData } from '@/hooks/useWeatherData';
import type { SceneVisualConfig } from '@/lib/sceneConfig';

export type { SceneVisualConfig, TimeOfDay, WeatherData, MotionValue };

export interface LandscapeCommonProps {
  cleanliness: number;
  isNight: boolean;
  synthwaveMode: boolean;
  isSnowing: boolean;
  skipIntro: boolean;
  windSpeed: number;
  timeOfDay: TimeOfDay;
}
