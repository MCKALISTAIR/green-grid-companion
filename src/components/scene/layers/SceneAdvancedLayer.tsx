import { AnimatePresence } from 'framer-motion';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { BackgroundMountains } from '../BackgroundMountains';
import { ForegroundGrass } from '../ForegroundGrass';
import { EVChargingStation } from '../EVChargingStation';
import { HydroDam } from '../HydroDam';
import { MeteorShower } from '../MeteorShower';
import { BiomassSmoke } from '../BiomassSmoke';
import { SCENE_SILHOUETTE_ASPECT } from '@/lib/sceneScaleBible';

/** Biomass stacks sit either side of the hero text column (scene x 112 to 288). */
/** Biomass stacks (scene x), both outside the hero text column at every size. */
export const BIOMASS_STACK_X = [8, 376] as const;

export interface SceneAdvancedLayerProps {
  sceneConfig: SceneVisualConfig;
  isCity: boolean;
  isCoastal: boolean;
  isNight: boolean;
  isRaining: boolean;
  windSpeed: number;
  hydroPercentage: number;
  biomassPercentage: number;
  showMeteorShower: boolean;
}

export function SceneAdvancedLayer({
  sceneConfig,
  isCity,
  isCoastal,
  isNight,
  isRaining,
  windSpeed,
  hydroPercentage,
  biomassPercentage,
  showMeteorShower,
}: SceneAdvancedLayerProps) {
  return (
    <>
      {/* ===== PHASE 3: ADVANCED FEATURES ===== */}

      {/* Background mountains for parallax */}
      <AnimatePresence>
        {!isCity && !isCoastal && sceneConfig.cleanliness > 0.5 && (
          <div className="absolute bottom-0 left-0 right-0 h-[75%] pointer-events-none z-1">
            <svg
              viewBox="0 30 400 120"
              className="w-full h-full"
              preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
              aria-hidden="true"
            >
              <BackgroundMountains isNight={isNight} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Foreground grass with wind sway */}
      <AnimatePresence>
        {!isCity && !isCoastal && sceneConfig.cleanliness > 0.6 && (
          <div className="absolute bottom-0 left-0 right-0 h-[75%] pointer-events-none z-30">
            <svg
              viewBox="0 30 400 120"
              className="w-full h-full"
              preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
              aria-hidden="true"
            >
              <ForegroundGrass windSpeed={windSpeed} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* EV Charging Station at night when clean — city/countryside street furniture */}
      <AnimatePresence>
        {!isCoastal && isNight && sceneConfig.cleanliness > 0.7 && (
          <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-16 overflow-hidden">
            <svg
              viewBox={isCity ? '0 0 400 150' : '0 30 400 120'}
              className="w-full h-full"
              preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
              aria-hidden="true"
            >
              <EVChargingStation isCharging={sceneConfig.cleanliness > 0.8} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Hydro Dam when rainy + hydro — countryside only */}
      <AnimatePresence>
        {!isCity && !isCoastal && isRaining && hydroPercentage > 10 && (
          <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-14 overflow-hidden">
            <svg
              viewBox="0 30 400 120"
              className="w-full h-full"
              preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
              aria-hidden="true"
            >
              <HydroDam flowIntensity={Math.min(hydroPercentage / 50, 1)} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Meteor Shower - Double-click moon */}
      <AnimatePresence>{showMeteorShower && <MeteorShower />}</AnimatePresence>

      {/* Biomass Smoke — countryside only */}
      <AnimatePresence>
        {!isCity && !isCoastal && biomassPercentage > 5 && sceneConfig.showRenewables && (
          <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-15 overflow-hidden">
            <svg
              viewBox="0 30 400 120"
              className="w-full h-full"
              preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
              aria-hidden="true"
            >
              <BiomassSmoke x={BIOMASS_STACK_X[0]} intensity={biomassPercentage / 100} />
              {biomassPercentage > 15 && <BiomassSmoke x={BIOMASS_STACK_X[1]} intensity={0.6} />}
            </svg>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
