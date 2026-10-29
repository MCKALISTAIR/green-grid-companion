import { motion, type MotionValue } from 'framer-motion';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { WeatherData } from '@/hooks/useWeatherData';
import { hasCloudBank } from '@/lib/cloudBank';
import { WeatherCloudBank } from '../WeatherEffects';

export interface SceneCloudBankLayerProps {
  skyY: MotionValue<number>;
  shouldReduceMotion: boolean;
  weather: WeatherData;
  isNight: boolean;
  timeOfDay: TimeOfDay;
  weatherKnown: boolean;
  cloudTopPx?: number;
}

/**
 * BH-117 (Design, 23 Oct 2026, option a): in city scenes the full cloud bank
 * (overcast, rain, unknown weather) is further away than the skyline, so it is
 * drawn behind it. This layer sits at z-0 and is placed in the DOM just before
 * CitySceneLayers, whose far layers (Edinburgh Castle, the back skyline) are also
 * z-0 and so paint in front of it. Everything that was in front of the bank in
 * the sky layer (z-[1]: rain, snow, sun, moon, fog) or above it (depth haze,
 * halo, mood) still is, and the bank's colours are unchanged. It moves with
 * the sky (skyY), as it did inside SceneSkyLayer.
 */
export function SceneCloudBankLayer({
  skyY,
  shouldReduceMotion,
  weather,
  isNight,
  timeOfDay,
  weatherKnown,
  cloudTopPx,
}: SceneCloudBankLayerProps) {
  if (!hasCloudBank(weather, weatherKnown)) return null;
  return (
    <motion.div
      style={{ y: shouldReduceMotion ? 0 : skyY }}
      className="absolute inset-0 pointer-events-none z-0"
      data-scene-bank-layer="behind-skyline"
    >
      <WeatherCloudBank
        weather={weather}
        isNight={isNight}
        timeOfDay={timeOfDay}
        weatherKnown={weatherKnown}
        cloudTopPx={cloudTopPx}
      />
    </motion.div>
  );
}
