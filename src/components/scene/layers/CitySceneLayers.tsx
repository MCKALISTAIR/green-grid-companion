import { motion, AnimatePresence, type MotionValue } from 'framer-motion';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { CleanlinessBand } from '@/hooks/useCleanlinessBand';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { CityLandscapeBack, CityLandscapeMid, CityLandscapeFront } from '../CityLandscape';
import { CityTraffic, Pigeon, ConstructionCrane, LondonEye, SmogBand, DistantStack, BatteryStorageContainer } from '../CityElements';
import { ValleyMist } from '../ValleyMist';
import { SceneHotspots, type HotspotDef } from '../SceneHotspots';

export interface CitySceneLayersProps {
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
  cleanlinessBand: CleanlinessBand;
  intensity: number;
}

export function CitySceneLayers({
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
  cleanlinessBand,
  intensity,
}: CitySceneLayersProps) {
  return (
    <>
      {/* City: Background skyline (backY) */}
      <motion.div
        style={{ y: shouldReduceMotion ? 0 : backY }}
        className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-0 overflow-hidden"
      >
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
          {/* Smog band behind skyline when grid is dirty */}
          <SmogBand cleanliness={sceneConfig.cleanliness} isNight={isNight} />
          {/* Distant stack on horizon when very dirty */}
          {sceneConfig.cleanliness < 0.2 && <DistantStack isNight={isNight} />}
          <CityLandscapeBack
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

      {/* City: Mid skyline (midY) */}
      <motion.div
        style={{ y: shouldReduceMotion ? 0 : midY }}
        className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-10 overflow-hidden"
      >
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
          <CityLandscapeMid
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

      {/* City: Valley Mist */}
      <ValleyMist cleanliness={sceneConfig.cleanliness} timeOfDay={timeOfDay} isNight={isNight} />

      {/* City: Foreground buildings + road + London Eye (grounded) + BESS */}
      <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-20 overflow-hidden">
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
          <CityLandscapeFront
            cleanliness={sceneConfig.cleanliness}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={isSnowing}
            isChristmas={new Date().getMonth() === 11}
            skipIntro={skipIntro}
            windSpeed={windSpeed}
            timeOfDay={timeOfDay}
          />
          {/* Landmark sits on the road layer so legs/plinth aren't buried behind mid/front towers */}
          <LondonEye isNight={isNight} skipIntro={skipIntro} />
          {/* Grid-scale battery storage with status LED */}
          <BatteryStorageContainer cleanliness={sceneConfig.cleanliness} isNight={isNight} />
        </svg>
      </div>

      {/* City: Traffic on the road */}
      <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-[22] overflow-hidden">
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
          <CityTraffic cleanliness={sceneConfig.cleanliness} isNight={isNight} />
        </svg>
      </div>

      {/* City: Pigeons during daytime when clean */}
      <AnimatePresence>
        {sceneConfig.isDaytime && sceneConfig.cleanliness > 0.4 && (
          <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-[23] overflow-hidden">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <Pigeon x={60} y={135} delay={0} />
              <Pigeon x={180} y={136} delay={1.5} />
              <Pigeon x={300} y={134} delay={3} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* City: Construction crane when dirty */}
      <AnimatePresence>
        {sceneConfig.cleanliness < 0.4 && (
          <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-5 overflow-hidden">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <ConstructionCrane x={350} isNight={isNight} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* City: Diegetic info hotspots — tappable props with fact bubbles */}
      <SceneHotspots
        hotspots={[
          {
            id: 'london-eye',
            label: 'London Eye',
            x: 18.75, y: 56.7,
            visible: true,
            fact: cleanlinessBand === 'very-clean'
              ? "London's landmarks are riding 100% renewable right now — the grid is squeaky clean."
              : 'The London Eye has run on 100% certified renewable electricity since 2018.',
          },
          {
            id: 'bess',
            label: 'Battery Storage',
            x: 82, y: 78,
            visible: true,
            fact: sceneConfig.cleanliness > 0.6
              ? 'Grid batteries are discharging cheap, clean overnight wind back into the system.'
              : 'Battery storage smooths spikes — charging when wind is plentiful, dispatching when demand peaks.',
          },
          {
            id: 'ev-charger',
            label: 'EV Charging',
            x: 50, y: 80,
            visible: isNight && sceneConfig.cleanliness > 0.7,
            fact: `Charging now adds roughly ${Math.round(intensity)} g CO₂ per kWh — among the cleanest windows of the day.`,
          },
          {
            id: 'distant-stack',
            label: 'Gas Peaker',
            x: 91, y: 50,
            visible: sceneConfig.cleanliness < 0.2,
            fact: 'Gas peaker plants kick in when demand spikes faster than renewables can ramp — the biggest driver of dirty grid hours.',
          },
        ] satisfies HotspotDef[]}
      />
    </>
  );
}
