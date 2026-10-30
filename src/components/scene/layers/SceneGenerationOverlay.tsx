import { motion, AnimatePresence } from 'framer-motion';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { turbineRotationSeconds } from '@/lib/turbineSpeed';
import type { TurbineSlot } from '@/lib/turbineLayout';
import { WindTurbine } from '../WindTurbine';
import { NuclearCoolingTower } from '../NuclearCoolingTower';
import { OffshoreWind } from '../OffshoreWind';
import { TidalWaves } from '../TidalWaves';
import { SCENE_SILHOUETTE_ASPECT, SCENE_WASH_ASPECT } from '@/lib/sceneScaleBible';

export interface SceneGenerationOverlayProps {
  sceneConfig: SceneVisualConfig;
  isCity: boolean;
  isCoastal: boolean;
  isNight: boolean;
  turbineLayout: TurbineSlot[];
  turbineOverdrive: number | null;
  handleTurbineClick: (i: number) => void;
  nuclearPercentage: number;
  windPercentage: number;
  hydroPercentage: number;
  marinePercentage: number;
  windSpeed: number;
}

export function SceneGenerationOverlay({
  sceneConfig,
  isCity,
  isCoastal,
  isNight,
  turbineLayout,
  turbineOverdrive,
  handleTurbineClick,
  nuclearPercentage,
  windPercentage,
  hydroPercentage,
  marinePercentage,
  windSpeed,
}: SceneGenerationOverlayProps) {
  return (
    <>
      {/* Ground colour cover strip — prevents the sky gradient bleeding through
          at the bottom corners where the SVG landscape shapes don't reach the edges */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-2 pointer-events-none z-[50]"
        animate={{ backgroundColor: sceneConfig.groundColor }}
        transition={{ duration: 2, ease: 'easeInOut' as const }}
        aria-hidden="true"
      />

      {/* Wind Turbines - dynamically positioned across the scene */}
      <AnimatePresence>
        {!isCity &&
          !isCoastal &&
          sceneConfig.showRenewables &&
          turbineLayout.map((slot, i) => {
            // Wind speed drives rotation; unknown weather → one idle speed for all
            const seconds = turbineRotationSeconds({
              kind: 'countryside',
              windSpeed: sceneConfig.windSpeed ?? 0,
              weatherKnown: sceneConfig.weatherKnown,
              index: i,
              layer: slot.layer,
            });
            const isOverdrive = turbineOverdrive === i;
            // Opacity based on depth layer
            const layerOpacity = slot.layer === 'back' ? 0.5 : slot.layer === 'mid' ? 0.75 : 1;

            return (
              <motion.div
                key={`turbine-${slot.left}-${slot.bottom}`}
                className="absolute"
                style={{
                  left: `${slot.left}%`,
                  bottom: `${slot.bottom}%`,
                  zIndex: slot.z,
                  opacity: layerOpacity,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: layerOpacity, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <WindTurbine
                  scale={slot.scale}
                  speed={isOverdrive ? 0.2 : seconds}
                  onClick={() => handleTurbineClick(i)}
                />
              </motion.div>
            );
          })}
      </AnimatePresence>

      {/* Solar panels — countryside only; city has rooftop panels in CityLandscape */}
      <AnimatePresence>
        {!isCity && !isCoastal && sceneConfig.showRenewables && sceneConfig.showSun && (
          <motion.div
            className="absolute bottom-6 right-6 flex gap-1.5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="relative w-7 h-5 bg-gen-solar/80 rounded-sm transform -skew-x-12 shadow-md overflow-hidden"
                style={{ opacity: Math.max(0.35, Math.min(1, sceneConfig.solarBrightness)) }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{
                    duration: 2,
                    delay: i * 0.5,
                    repeat: Infinity,
                    repeatDelay: 3,
                    ease: 'easeInOut' as const,
                  }}
                />
                <div className="absolute inset-0 grid grid-cols-2 gap-px opacity-50">
                  <div className="border-r border-gen-solar/50" />
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* PR-2b: the white-box factories are gone. The one gas plant is drawn in the
          countryside back-hill layer (GasPlant), with smoke only from its stacks at
          NESO moderate and above. */}

      {/* BH-102 (Design): no Lucide leaf, flame or droplet icons in the scene. They read
          as UI chrome, not world. Cleanliness shows through the world itself (sky, smoke,
          grass) and the hero; nothing replaces them. */}

      {/* Nuclear Cooling Towers - Show when nuclear % > 5 */}
      <AnimatePresence>
        {sceneConfig.showRenewables && nuclearPercentage > 5 && !isCity && !isCoastal && (
          <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-15">
            <svg
              viewBox="0 30 400 120"
              className="w-full h-full"
              preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
              aria-hidden="true"
            >
              <NuclearCoolingTower
                x={280}
                steamIntensity={nuclearPercentage / 100}
                isNight={isNight}
              />
              {nuclearPercentage > 15 && (
                <NuclearCoolingTower x={240} steamIntensity={0.5} isNight={isNight} />
              )}
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Offshore Wind Turbines — countryside horizon only (coastal has CoastalOffshoreWind) */}
      <AnimatePresence>
        {windPercentage > 10 && !isCity && !isCoastal && (
          <div className="absolute bottom-0 left-0 right-0 h-[65%] pointer-events-none z-5">
            <svg
              viewBox="0 30 400 120"
              className="w-full h-full"
              preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
              aria-hidden="true"
            >
              <OffshoreWind
                count={Math.min(3, Math.floor(windPercentage / 10))}
                windSpeed={windSpeed}
                weatherKnown={sceneConfig.weatherKnown}
              />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Tidal Waves — coastal only */}
      <AnimatePresence>
        {isCoastal && (hydroPercentage > 5 || marinePercentage > 0) && (
          <div className="absolute bottom-0 left-0 right-0 h-[65%] pointer-events-none z-25">
            <svg
              viewBox="0 0 400 150"
              className="w-full h-full"
              preserveAspectRatio={SCENE_WASH_ASPECT}
              aria-hidden="true"
            >
              <TidalWaves intensity={(hydroPercentage + marinePercentage) / 100} />
            </svg>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
