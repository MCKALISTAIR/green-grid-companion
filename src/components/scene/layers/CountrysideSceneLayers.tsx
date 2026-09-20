import { motion, AnimatePresence, type MotionValue } from 'framer-motion';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { LandscapeBack, LandscapeMid, LandscapeFront } from '../Landscape';
import { ValleyMist } from '../ValleyMist';
import { Sheep } from '../Sheep';
import { SceneHotspots, type HotspotDef } from '../SceneHotspots';

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
  windPercentage,
  nuclearPercentage,
  hydroPercentage,
  isRaining,
}: CountrysideSceneLayersProps) {
  return (
    <>
      {/* Countryside: Background Landscape Layer (Back Hills - backY) */}
      <motion.div
        style={{ y: shouldReduceMotion ? 0 : backY }}
        className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-0 overflow-hidden"
      >
        <svg viewBox="0 30 400 120" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
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
        </svg>
      </motion.div>

      {/* Countryside: Background Landscape Layer (Mid Hills - midY) */}
      <motion.div
        style={{ y: shouldReduceMotion ? 0 : midY }}
        className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-10 overflow-hidden"
      >
        <svg viewBox="0 30 400 120" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
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
      <ValleyMist cleanliness={sceneConfig.cleanliness} timeOfDay={timeOfDay} isNight={isNight} />

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
            <Sheep x={20} y={15} scale={0.7} isNight={isNight} delay={0.5} />
            <Sheep x={45} y={18} scale={0.65} isNight={isNight} delay={1.2} />
            <Sheep x={75} y={14} scale={0.7} isNight={isNight} delay={2.0} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countryside: Foreground Landscape Layer (Front Hill) */}
      <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-20 overflow-hidden">
        <svg viewBox="0 30 400 120" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
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

      {/* Countryside: Diegetic info hotspots */}
      <SceneHotspots
        hotspots={[
          {
            id: 'countryside-wind',
            label: 'Wind Farm',
            x: 48, y: 58,
            visible: sceneConfig.showRenewables && windPercentage > 0,
            fact: 'Onshore wind is one of the cheapest forms of electricity generation in the UK, saving carbon and lowering energy bills.',
          },
          {
            id: 'countryside-solar',
            label: 'Solar Array',
            x: 88, y: 88,
            visible: sceneConfig.showRenewables && sceneConfig.showSun,
            fact: 'UK solar capacity has grown rapidly, providing clean power to millions of homes during sunny peak demand hours.',
          },
          {
            id: 'countryside-hydro',
            label: 'Hydro Dam',
            x: 10, y: 82,
            visible: isRaining && hydroPercentage > 10,
            fact: 'Hydroelectric power uses flowing water to drive turbines, providing reliable renewable energy that can ramp up instantly.',
          },
          {
            id: 'countryside-nuclear',
            label: 'Nuclear Power',
            x: 70, y: 80,
            visible: sceneConfig.showRenewables && nuclearPercentage > 5,
            fact: 'Nuclear energy provides a steady foundation of low-carbon electricity, running continuously regardless of weather conditions.',
          },
        ] satisfies HotspotDef[]}
      />
    </>
  );
}
