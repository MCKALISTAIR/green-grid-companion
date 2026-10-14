import { AnimatePresence } from 'framer-motion';
import type { WeatherData } from '@/hooks/useWeatherData';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { SnowGround, FrozenPond, BreathMist, SnowOnPanels } from '../WinterElements';

export interface SceneWinterLayerProps {
  weather: WeatherData;
  sceneConfig: SceneVisualConfig;
}

export function SceneWinterLayer({ weather, sceneConfig }: SceneWinterLayerProps) {
  return (
    <>
      {/* ===== WINTER ELEMENTS ===== */}

      {/* Snow ground cover */}
      <AnimatePresence>
        {weather.isSnowing && <SnowGround intensity={weather.precipitationIntensity} />}
      </AnimatePresence>

      {/* Frozen pond */}
      <AnimatePresence>
        {weather.isSnowing && sceneConfig.cleanliness > 0.4 && <FrozenPond />}
      </AnimatePresence>

      {/* Breath mist from sheep in cold weather */}
      <AnimatePresence>
        {weather.isSnowing && sceneConfig.cleanliness > 0.4 && (
          <>
            <BreathMist x={22} y={18} />
            <BreathMist x={47} y={20} />
            <BreathMist x={76} y={17} />
          </>
        )}
      </AnimatePresence>

      {/* Snow accumulation on solar panels */}
      <AnimatePresence>
        {weather.isSnowing && sceneConfig.showRenewables && sceneConfig.showSun && <SnowOnPanels />}
      </AnimatePresence>
    </>
  );
}
