import { motion, AnimatePresence, type MotionValue } from 'framer-motion';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { CleanlinessBand } from '@/hooks/useCleanlinessBand';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import type { CityVariant } from '@/hooks/useSceneType';
import { getCityHeroEmphasis } from '@/lib/cityHeroDemotion';
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
  /**
   * Which city (PR-B2): London landmarks, the Eye and the Tube flash render
   * only for 'london'. 'edinburgh' and 'generic' get the skyline without them
   * until the art PR fills CityVariantLandmarkSlot. Defaults to 'generic'.
   */
  cityVariant?: CityVariant;
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
  cityVariant = 'generic',
}: CitySceneLayersProps) {
  const isLondon = cityVariant === 'london';
  const hero = getCityHeroEmphasis(cleanlinessBand);
  const showStack =
    sceneConfig.cleanliness < 0.2 || hero.hero === 'distant-stack' || hero.hero === 'smog';

  return (
    <>
      {/* City: Background skyline (backY) */}
      <motion.div
        data-city-variant={cityVariant}
        style={{ y: shouldReduceMotion ? 0 : backY }}
        animate={{ opacity: hero.skylineOpacity }}
        transition={{ duration: 1.2, ease: 'easeInOut' as const }}
        className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-0 overflow-hidden"
      >
        <svg
          viewBox="0 0 400 150"
          className="w-full h-full"
          preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
          aria-hidden="true"
        >
          <SmogBand cleanliness={sceneConfig.cleanliness} isNight={isNight} />
          {showStack && <DistantStack isNight={isNight} />}
          {/* Landmark far layer (Design brief §11, layer 3): Edinburgh only.
              Edinburgh Castle on Castle Rock lands here in the art PR (PR-B1),
              behind CityLandscapeBack. Empty slot until then. */}
          {cityVariant === 'edinburgh' && <g data-city-landmark-slot="edinburgh-far" />}
          <CityLandscapeBack
            cleanliness={sceneConfig.cleanliness}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={isSnowing}
            isChristmas={new Date().getMonth() === 11}
            skipIntro={skipIntro}
            windSpeed={windSpeed}
            timeOfDay={timeOfDay}
            cityVariant={cityVariant}
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
        <svg
          viewBox="0 0 400 150"
          className="w-full h-full"
          preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
          aria-hidden="true"
        >
          <CityLandscapeMid
            cleanliness={sceneConfig.cleanliness}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={isSnowing}
            isChristmas={new Date().getMonth() === 11}
            skipIntro={skipIntro}
            windSpeed={windSpeed}
            timeOfDay={timeOfDay}
            cityVariant={cityVariant}
          />
        </svg>
      </motion.div>

      <ValleyMist cleanliness={sceneConfig.cleanliness} timeOfDay={timeOfDay} isNight={isNight} />

      {/* City: Foreground buildings + road + BESS (+ London Eye for London only) */}
      <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-20 overflow-hidden">
        <svg
          viewBox="0 0 400 150"
          className="w-full h-full"
          preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
          aria-hidden="true"
        >
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
              cityVariant={cityVariant}
            />
          </g>
          {isLondon && (
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
          )}
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
        <svg
          viewBox="0 0 400 150"
          className="w-full h-full"
          preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
          aria-hidden="true"
        >
          {hero.trafficCount > 0 && (
            <CityTraffic
              cleanliness={sceneConfig.cleanliness}
              isNight={isNight}
              maxVehicles={hero.trafficCount}
              showBus={hero.showBus}
            />
          )}
          {!shouldReduceMotion && (
            <TubeFlash enabled={hero.showTubeFlash} cityVariant={cityVariant} />
          )}
        </svg>
      </div>

      <AnimatePresence>
        {hero.pigeonCount > 0 && sceneConfig.isDaytime && sceneConfig.cleanliness > 0.4 && (
          <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-[23] overflow-hidden">
            <svg
              viewBox="0 0 400 150"
              className="w-full h-full"
              preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
              aria-hidden="true"
            >
              <Pigeon x={180} y={136} delay={0} />
              {hero.pigeonCount > 1 && <Pigeon x={60} y={135} delay={1.5} />}
            </svg>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hero.showCrane && sceneConfig.cleanliness < 0.4 && (
          <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-5 overflow-hidden">
            <svg
              viewBox="0 0 400 150"
              className="w-full h-full"
              preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
              aria-hidden="true"
            >
              <ConstructionCrane x={350} isNight={isNight} />
            </svg>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
