import { AnimatePresence } from 'framer-motion';
import type { WeatherData } from '@/hooks/useWeatherData';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { Rainbow } from '../Rainbow';
import { PollutionWarning } from '../PollutionWarning';
import { NetZeroCelebration } from '../NetZeroCelebration';
import { shouldCelebrateZeroCarbon } from '@/lib/sceneUtils';

export interface SceneMilestoneFXProps {
  intensity: number;
  weather: WeatherData;
  sceneConfig: SceneVisualConfig;
  /** False while loading or after an error, when intensity is a placeholder 0. */
  hasLiveReading?: boolean;
}

export function SceneMilestoneFX({
  intensity,
  weather,
  sceneConfig,
  hasLiveReading = true,
}: SceneMilestoneFXProps) {
  return (
    <>
      {/* ===== PHASE 2: CARBON MILESTONES ===== */}

      {/* Rainbow - appears during/after rain when sun is visible (daytime + rain) */}
      <AnimatePresence>
        {intensity < 50 && weather.isRaining && sceneConfig.isDaytime && <Rainbow />}
      </AnimatePresence>

      {/* Pollution Warning - High carbon (>300g) */}
      <AnimatePresence>
        {intensity > 300 && <PollutionWarning />}
      </AnimatePresence>

      {/* Zero-carbon celebration: only on a real 0 gCO2/kWh reading */}
      <AnimatePresence>
        {shouldCelebrateZeroCarbon(intensity, hasLiveReading) && <NetZeroCelebration />}
      </AnimatePresence>
    </>
  );
}
