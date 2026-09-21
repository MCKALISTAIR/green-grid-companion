import { motion, AnimatePresence, type MotionValue } from 'framer-motion';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { CleanlinessBand } from '@/hooks/useCleanlinessBand';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { getCityHeroEmphasis, isCityHotspotActive } from '@/lib/cityHeroDemotion';
import { SCENE_SILHOUETTE_ASPECT } from '@/lib/sceneScaleBible';
import { CityLandscapeBack, CityLandscapeMid, CityLandscapeFront } from '../CityLandscape';
import {
  CityTraffic,
  Pigeon,
  ConstructionCrane,
  LondonEye,
  SmogBand,
  DistantStack,
  BatteryStorageContainer,
  TubeFlash,
} from '../CityElements';
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
  const hero = getCityHeroEmphasis(cleanlinessBand);
  const showStack = sceneConfig.cleanliness < 0.2 || hero.hero === 'distant-stack' || hero.hero === 'smog';

  return (
    <>
      {/* City: Background skyline (backY) */}
      <motion.div
        style={{ y: shouldReduceMotion ? 0 : backY }}
        animate={{ opacity: hero.skylineOpacity }}
        transition={{ duration: 1.2, ease: 'easeInOut' as const }}
        className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-0 overflow-hidden"
      >
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
          <SmogBand cleanliness={sceneConfig.cleanliness} isNight={isNight} />
          {showStack && <DistantStack isNight={isNight} />}
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
        animate={{ opacity: hero.skylineOpacity }}
        transition={{ duration: 1.2, ease: 'easeInOut' as const }}
        className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-10 overflow-hidden"
      >
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
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

      <ValleyMist cleanliness={sceneConfig.cleanliness} timeOfDay={timeOfDay} isNight={isNight} />

      {/* City: Foreground buildings + road + London Eye + BESS */}
      <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-20 overflow-hidden">
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
          <g opacity={hero.frontOpacity} style={{ transition: 'opacity 1.2s ease' }}>
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
          </g>
          <g
            opacity={hero.eyeOpacity}
            style={{
              transition: 'opacity 1.2s ease',
              transformOrigin: '75px 138px',
              transform: `scale(${hero.eyeScale})`,
            }}
          >
            <LondonEye isNight={isNight} skipIntro={skipIntro} />
          </g>
          <g
            opacity={hero.bessOpacity}
            style={{
              transition: 'opacity 1.2s ease',
              transformOrigin: '331px 138px',
              transform: `scale(${hero.bessScale})`,
            }}
          >
            <BatteryStorageContainer cleanliness={sceneConfig.cleanliness} isNight={isNight} />
          </g>
        </svg>
      </div>

      {/* City: sparse traffic + Tube flash — alive at low density */}
      <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-[22] overflow-hidden">
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
          {hero.trafficCount > 0 && (
            <CityTraffic
              cleanliness={sceneConfig.cleanliness}
              isNight={isNight}
              maxVehicles={hero.trafficCount}
              showBus={hero.showBus}
            />
          )}
          {!shouldReduceMotion && <TubeFlash enabled={hero.showTubeFlash} />}
        </svg>
      </div>

      <AnimatePresence>
        {hero.pigeonCount > 0 && sceneConfig.isDaytime && sceneConfig.cleanliness > 0.4 && (
          <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-[23] overflow-hidden">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
              <Pigeon x={180} y={136} delay={0} />
              {hero.pigeonCount > 1 && <Pigeon x={60} y={135} delay={1.5} />}
            </svg>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hero.showCrane && sceneConfig.cleanliness < 0.4 && (
          <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-5 overflow-hidden">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
              <ConstructionCrane x={350} isNight={isNight} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      <SceneHotspots
        hotspots={[
          {
            id: 'london-eye',
            label: 'London Eye',
            x: 18.75, y: 56.7,
            visible: isCityHotspotActive(hero.hero, 'london-eye', hero),
            fact: cleanlinessBand === 'very-clean'
              ? "London's landmarks are riding 100% renewable right now — the grid is squeaky clean."
              : 'The London Eye has run on 100% certified renewable electricity since 2018.',
          },
          {
            id: 'bess',
            label: 'Battery Storage',
            x: 82, y: 78,
            visible: isCityHotspotActive(hero.hero, 'bess', hero),
            fact: sceneConfig.cleanliness > 0.6
              ? 'Grid batteries are discharging cheap, clean overnight wind back into the system.'
              : 'Battery storage smooths spikes — charging when wind is plentiful, dispatching when demand peaks.',
          },
          {
            id: 'ev-charger',
            label: 'EV Charging',
            x: 50, y: 80,
            visible:
              isNight &&
              sceneConfig.cleanliness > 0.7 &&
              isCityHotspotActive(hero.hero, 'ev-charger', hero),
            fact: `Charging now adds roughly ${Math.round(intensity)} g CO₂ per kWh — among the cleanest windows of the day.`,
          },
          {
            id: 'distant-stack',
            label: 'Gas Peaker',
            x: 91, y: 50,
            visible: showStack && isCityHotspotActive(hero.hero, 'distant-stack', hero),
            fact: 'Gas peaker plants kick in when demand spikes faster than renewables can ramp — the biggest driver of dirty grid hours.',
          },
        ] satisfies HotspotDef[]}
      />
    </>
  );
}
