import { motion, AnimatePresence, type MotionValue } from 'framer-motion';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { LandscapeBack, LandscapeMid, LandscapeFront } from '../Landscape';
import { ValleyMist } from '../ValleyMist';
import { Sheep } from '../Sheep';
import { SCENE_SILHOUETTE_ASPECT } from '@/lib/sceneScaleBible';
import type { HazeBand } from '@/lib/sceneHaze';
import { GasPlant } from '../GasPlant';

export interface CountrysideSceneLayersProps {
  shouldReduceMotion: boolean;
  backY: MotionValue<number>;
  midY: MotionValue<number>;
  sceneConfig: SceneVisualConfig;
  isNight: boolean;
  synthwaveMode: boolean;
  isSnowing: boolean;
  skipIntro: boolean;
  windSpeed: number;
  timeOfDay: TimeOfDay;
  windPercentage: number;
  nuclearPercentage: number;
  hydroPercentage: number;
  isRaining: boolean;
  /** PR-2b: NESO haze band; the gas plant smokes at moderate and above. */
  hazeBand?: HazeBand;
}

export function CountrysideSceneLayers({
  shouldReduceMotion,
  backY,
  midY,
  sceneConfig,
  isNight,
  synthwaveMode,
  isSnowing,
  skipIntro,
  windSpeed,
  timeOfDay,
  hazeBand = 'none',
}: CountrysideSceneLayersProps) {
  return (
    <>
      {/* Countryside: Background Landscape Layer (Back Hills - backY) */}
      <motion.div
        style={{ y: shouldReduceMotion ? 0 : backY }}
        className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-0 overflow-hidden"
      >
        <svg
          viewBox="0 30 400 120"
          className="w-full h-full"
          preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
          aria-hidden="true"
        >
          <LandscapeBack
            cleanliness={sceneConfig.cleanliness}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={isSnowing}
            isChristmas={new Date().getMonth() === 11}
            skipIntro={skipIntro}
            windSpeed={windSpeed}
            timeOfDay={timeOfDay}
          />
          {/* PR-2b: the gas plant on the back hill, always present; smoke only at
              moderate and above (Design brief Q5). */}
          <GasPlant band={hazeBand} isNight={isNight} />
        </svg>
      </motion.div>

      {/* Countryside: Background Landscape Layer (Mid Hills - midY) */}
      <motion.div
        style={{ y: shouldReduceMotion ? 0 : midY }}
        className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-10 overflow-hidden"
      >
        <svg
          viewBox="0 30 400 120"
          className="w-full h-full"
          preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
          aria-hidden="true"
        >
          <LandscapeMid
            cleanliness={sceneConfig.cleanliness}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={isSnowing}
            isChristmas={new Date().getMonth() === 11}
            skipIntro={skipIntro}
            windSpeed={windSpeed}
            timeOfDay={timeOfDay}
          />
        </svg>
      </motion.div>

      {/* Countryside: Valley Mist */}
      <ValleyMist timeOfDay={timeOfDay} isNight={isNight} />

      {/* Countryside: Flock of Sheep */}
      <AnimatePresence>
        {sceneConfig.cleanliness > 0.4 && !synthwaveMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ y: shouldReduceMotion ? 0 : midY }}
            className="z-10 absolute inset-0 pointer-events-none"
          >
            <Sheep x={22} y={28} scale={0.55} isNight={isNight} delay={0.5} />
            <Sheep x={48} y={32} scale={0.5} isNight={isNight} delay={1.2} />
            <Sheep x={72} y={26} scale={0.55} isNight={isNight} delay={2.0} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countryside: Foreground Landscape Layer (Front Hill) */}
      <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-20 overflow-hidden">
        <svg
          viewBox="0 30 400 120"
          className="w-full h-full"
          preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
          aria-hidden="true"
        >
          <LandscapeFront
            cleanliness={sceneConfig.cleanliness}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={isSnowing}
            isChristmas={new Date().getMonth() === 11}
            skipIntro={skipIntro}
            windSpeed={windSpeed}
            timeOfDay={timeOfDay}
          />
        </svg>
      </div>
    </>
  );
}
