import { Leaf, Flame, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import type { TurbineSlot } from '@/lib/turbineLayout';
import { SimpleFactory } from '../SimpleFactory';
import { WindTurbine } from '../WindTurbine';
import { SmokeParticle } from '../SmokeParticle';
import { NuclearCoolingTower } from '../NuclearCoolingTower';
import { OffshoreWind } from '../OffshoreWind';
import { TidalWaves } from '../TidalWaves';

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
        {!isCity && !isCoastal && sceneConfig.showRenewables && turbineLayout.map((slot, i) => {
          // Wind speed drives rotation: near-zero wind → very slow / stopped
          const effectiveWindSpeed = sceneConfig.windSpeed ?? 0;
          const baseSpeed = effectiveWindSpeed < 2
            ? 30 // Almost still
            : Math.max(1.5, 6 - (effectiveWindSpeed / 8));
          const isOverdrive = turbineOverdrive === i;
          // Background turbines slightly slower for parallax feel
          const layerSpeedMod = slot.layer === 'back' ? 1.3 : slot.layer === 'mid' ? 1.1 : 1;
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
                speed={isOverdrive ? 0.2 : (baseSpeed * layerSpeedMod + i * 0.2)}
                onClick={() => handleTurbineClick(i)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Solar panels with reflection animation */}
      <AnimatePresence>
        {sceneConfig.showRenewables && sceneConfig.showSun && (
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
                style={{ opacity: 0.7 + (sceneConfig.cleanliness * 0.3) }}
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

      {/* Factories for dirty energy */}
      <AnimatePresence>
        {sceneConfig.showFactories && !isCity && !isCoastal && (
          <motion.div
            className="absolute bottom-14 left-6 flex gap-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative">
              <SimpleFactory className="w-18 h-18 text-secondary" style={{ width: '4.5rem', height: '4.5rem' }} isNight={isNight} />
              {sceneConfig.showSmoke && (
                <>
                  <SmokeParticle delay={0} x={35} />
                  <SmokeParticle delay={0.8} x={40} />
                  <SmokeParticle delay={1.6} x={45} />
                  <SmokeParticle delay={0.4} x={60} />
                  <SmokeParticle delay={1.2} x={65} />
                </>
              )}
            </div>
            {sceneConfig.cleanliness < 0.3 && (
              <motion.div
                className="relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <SimpleFactory className="w-14 h-14 text-secondary/90" isNight={isNight} />
                {sceneConfig.showSmoke && (
                  <>
                    <SmokeParticle delay={0.3} x={35} />
                    <SmokeParticle delay={1.1} x={45} />
                    <SmokeParticle delay={0.7} x={55} />
                  </>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating leaves for very clean */}
      <AnimatePresence>
        {sceneConfig.cleanliness > 0.75 && sceneConfig.isDaytime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Leaf
              className="absolute bottom-24 left-[25%] w-5 h-5 text-primary animate-leaf-float"
              style={{ animationDelay: '0s' }}
              aria-hidden="true"
            />
            <Leaf
              className="absolute bottom-28 right-[35%] w-4 h-4 text-primary/80 animate-leaf-float"
              style={{ animationDelay: '1.5s' }}
              aria-hidden="true"
            />
            <Leaf
              className="absolute bottom-20 left-[50%] w-3 h-3 text-primary/70 animate-leaf-float"
              style={{ animationDelay: '3s' }}
              aria-hidden="true"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fire/flames for very dirty with flicker */}
      <AnimatePresence>
        {sceneConfig.cleanliness < 0.2 && (
          <motion.div
            className="absolute bottom-10 left-24 flex gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 0.95, 1], rotate: [-2, 2, -2] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Flame className="w-7 h-7 text-destructive" aria-hidden="true" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 0.95, 1.1, 1], rotate: [2, -2, 2] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
            >
              <Flame className="w-5 h-5 text-destructive/80" aria-hidden="true" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Water/hydro indicator for clean energy */}
      <AnimatePresence>
        {sceneConfig.cleanliness > 0.6 && (
          <motion.div
            className="absolute bottom-3 right-20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
            >
              <Droplets className="w-6 h-6 text-gen-hydro/60" aria-hidden="true" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nuclear Cooling Towers - Show when nuclear % > 5 */}
      <AnimatePresence>
        {sceneConfig.showRenewables && nuclearPercentage > 5 && !isCity && !isCoastal && (
          <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-15">
            <svg viewBox="0 30 400 120" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <NuclearCoolingTower x={280} steamIntensity={nuclearPercentage / 100} isNight={isNight} />
              {nuclearPercentage > 15 && <NuclearCoolingTower x={240} steamIntensity={0.5} isNight={isNight} />}
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Offshore Wind Turbines - Show when wind % > 10 */}
      <AnimatePresence>
        {windPercentage > 10 && !isCity && (
          <div className="absolute bottom-0 left-0 right-0 h-[65%] pointer-events-none z-5">
            <svg viewBox="0 30 400 120" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <OffshoreWind count={Math.min(3, Math.floor(windPercentage / 10))} windSpeed={windSpeed} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Tidal Waves - Show when hydro/marine % > 5 */}
      <AnimatePresence>
        {(hydroPercentage > 5 || marinePercentage > 0) && (
          <div className="absolute bottom-0 left-0 right-0 h-[65%] pointer-events-none z-25">
            <svg viewBox="0 30 400 120" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <TidalWaves intensity={(hydroPercentage + marinePercentage) / 100} />
            </svg>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
