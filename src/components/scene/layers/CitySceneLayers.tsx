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
  BatteryStorageContainer,
  TubeFlash,
} from '../CityElements';
import { ValleyMist } from '../ValleyMist';
import { EdinburghCastle } from '../EdinburghCastle';
import { isLandmarkHeroLit, type CityWeatherState } from '@/lib/cityLandmarkPalette';
import { CityGasPlant } from '../GasPlant';

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
   * Which city (PR-B2): London landmarks, the dome, the Eye and the Tube flash
   * render only for 'london'. 'edinburgh' gets the neutral GB skyline with
   * Edinburgh Castle in the far layer; 'generic' gets the neutral skyline with
   * the church spire (PR-B1, Design brief §11). Defaults to 'generic'.
   */
  cityVariant?: CityVariant;
  /**
   * NESO index string ('very low' … 'very high') when there is a live reading.
   * Drives the decorative very-clean landmark light (castle / spire) and the
   * castle's haze. Art only; no data logic here.
   */
  nesoIndex?: string;
  /** Collapsed weather state for landmark colour treatments (§11.2). */
  weatherState?: CityWeatherState;
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
  nesoIndex,
  weatherState = 'clear',
}: CitySceneLayersProps) {
  const isLondon = cityVariant === 'london';
  const hero = getCityHeroEmphasis(cleanlinessBand);
  const landmarkHero = isLandmarkHeroLit(nesoIndex, cleanlinessBand);

  return (
    <>
      {/* Landmark far layer (Design brief §11, layer 3): Edinburgh Castle on its
          rock, behind the back row. Its own layer so the skyline demotion never
          fades it; static art, no filters. */}
      {cityVariant === 'edinburgh' && (
        <motion.div
          data-city-landmark-layer="edinburgh-far"
          style={{ y: shouldReduceMotion ? 0 : backY }}
          className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-0 overflow-hidden"
        >
          <svg
            viewBox="0 0 400 150"
            className="w-full h-full"
            preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
            aria-hidden="true"
          >
            <EdinburghCastle
              timeOfDay={timeOfDay}
              weather={weatherState}
              nesoIndex={nesoIndex}
              heroLit={landmarkHero}
              synthwaveMode={synthwaveMode}
            />
          </svg>
        </motion.div>
      )}

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
            landmarkHero={landmarkHero}
            weatherState={weatherState}
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
            landmarkHero={landmarkHero}
            weatherState={weatherState}
          />
          {/* Scene audit item 4: a small gas plant, always present, with the
              same band-driven smoke as the countryside plant. It stands in front
              of the mid skyline and behind the front buildings (behind the mid
              skyline it was hidden or washed out by the haze), clear of the London crane. It replaces the faint
              high-only distant stack. */}
          {cityVariant !== 'edinburgh' && (
            <CityGasPlant band={sceneConfig.hazeBand} isNight={isNight} />
          )}
        </svg>
      </motion.div>

      <ValleyMist timeOfDay={timeOfDay} isNight={isNight} />

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
              landmarkHero={landmarkHero}
              weatherState={weatherState}
            />
          </g>
          {isLondon && (
            <g
              opacity={hero.landmarkOpacity}
              style={{
                transition: 'opacity 1.2s ease',
                transformOrigin: '75px 138px',
                transform: `scale(${hero.landmarkScale})`,
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
        {/* Reduce Motion: no pigeons, like the Tube flash. They wander, peck and fly off forever. */}
        {!shouldReduceMotion &&
          hero.pigeonCount > 0 &&
          sceneConfig.isDaytime &&
          sceneConfig.cleanliness > 0.4 && (
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
