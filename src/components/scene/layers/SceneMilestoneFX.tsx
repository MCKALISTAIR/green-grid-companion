import { AnimatePresence } from 'framer-motion';
import type { WeatherData } from '@/hooks/useWeatherData';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { Rainbow } from '../Rainbow';
import { PollutionWarning } from '../PollutionWarning';
import { NetZeroCelebration } from '../NetZeroCelebration';

export interface SceneMilestoneFXProps {
  intensity: number;
  weather: WeatherData;
  sceneConfig: SceneVisualConfig;
}

export function SceneMilestoneFX({
  intensity,
  weather,
  sceneConfig,
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

      {/* Net Zero Celebration - Zero or negative carbon */}
      <AnimatePresence>
        {intensity <= 0 && <NetZeroCelebration />}
      </AnimatePresence>
    </>
  );
}
