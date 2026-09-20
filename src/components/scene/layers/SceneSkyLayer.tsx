import { Sun } from 'lucide-react';
import { motion, AnimatePresence, type MotionValue } from 'framer-motion';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { WeatherData } from '@/hooks/useWeatherData';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { WeatherEffects } from '../WeatherEffects';
import { AuroraBorealis } from '../AuroraBorealis';
import { Stars } from '../Stars';
import { Moon } from '../Moon';
import { SunRay } from '../SunRay';

export interface SceneSkyLayerProps {
  skyY: MotionValue<number>;
  shouldReduceMotion: boolean;
  weather: WeatherData;
  isNight: boolean;
  propIntensity: number;
  sceneConfig: SceneVisualConfig;
  sunPosition: number;
  timeOfDay: TimeOfDay;
  synthwaveMode: boolean;
  setSynthwaveMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  sunGlassesActive: boolean;
  handleMoonDoubleClick: () => void;
  handleSunDoubleClick: () => void;
  impactMedium: () => void;
}

export function SceneSkyLayer({
  skyY,
  shouldReduceMotion,
  weather,
  isNight,
  propIntensity,
  sceneConfig,
  sunPosition,
  timeOfDay,
  synthwaveMode,
  setSynthwaveMode,
  sunGlassesActive,
  handleMoonDoubleClick,
  handleSunDoubleClick,
  impactMedium,
}: SceneSkyLayerProps) {
  return (
    <motion.div
      style={{ y: shouldReduceMotion ? 0 : skyY }}
      className="absolute inset-0 pointer-events-none z-[1]"
    >
      <WeatherEffects weather={weather} isNight={isNight} cleanliness={sceneConfig.cleanliness} />

      {/* Aurora Borealis for ultra-clean winter nights (moved here to parallax with sky) */}
      <AnimatePresence>
        {isNight && propIntensity < 30 && (new Date().getMonth() >= 11 || new Date().getMonth() <= 2) && (
          <AuroraBorealis intensity={(30 - propIntensity) / 30} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sceneConfig.showStars && (
          <Stars count={40} visibility={sceneConfig.starVisibility} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sceneConfig.showMoon && <Moon position={sunPosition} onDoubleClick={handleMoonDoubleClick} />}
      </AnimatePresence>

      <AnimatePresence>
        {sceneConfig.showSunRays && (
          <div className="absolute top-0 right-0 overflow-hidden w-48 h-48">
            {[...Array(5)].map((_, i) => (
              <SunRay key={i} angle={20 + i * 15} delay={i * 0.3} />
            ))}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sceneConfig.showSun && (
          <motion.div
            className="absolute z-20 pointer-events-auto"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: sceneConfig.cleanliness * 0.3 + 0.7,
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 1.5, ease: 'easeInOut' as const }}
            style={{
              // Position via style — Framer `animate` top/right % was resolving to 0px
              // and parking the sun mid-frame (and duplicating under grid capture).
              top: timeOfDay === 'sunset' ? '35%' : timeOfDay === 'morning' ? '15%' : timeOfDay === 'afternoon' ? '12%' : '8%',
              right: timeOfDay === 'sunset' ? '15%' : timeOfDay === 'morning' ? '20%' : '8%',
              left: 'auto',
              filter: `brightness(${sceneConfig.solarBrightness + 0.5})`,
            }}
          >
            <motion.div
              className="cursor-pointer relative select-none"
              role="button"
              tabIndex={0}
              aria-label={`Toggle synthwave mode ${synthwaveMode ? 'off' : 'on'}. Double click for cool sunglasses.`}
              onClick={() => {
                impactMedium();
                setSynthwaveMode(!synthwaveMode);
              }}
              onDoubleClick={handleSunDoubleClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  impactMedium();
                  setSynthwaveMode(!synthwaveMode);
                }
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                y: [0, -4, 0], // Gentle floating action
              }}
              transition={{
                y: {
                  repeat: Infinity,
                  duration: 4,
                  ease: 'easeInOut' as const,
                },
                scale: { type: 'spring' as const, stiffness: 400, damping: 15 },
              }}
            >
              <motion.div
                className="absolute inset-0 w-20 h-20 -translate-x-2 -translate-y-2 rounded-full blur-xl pointer-events-none"
                style={{
                  backgroundColor: timeOfDay === 'sunset' ? 'hsl(30 90% 55% / 0.4)' : 'hsl(var(--accent) / 0.3)',
                }}
                animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
              />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 35, repeat: Infinity, ease: 'linear' as const }}
                className="relative z-10 pointer-events-none"
              >
                <Sun
                  className={`w-16 h-16 ${timeOfDay === 'sunset' ? 'text-orange-400' : 'text-accent'}`}
                  aria-hidden="true"
                />
              </motion.div>

              {/* Sunglasses Overlay */}
              <AnimatePresence>
                {sunGlassesActive && (
                  <motion.div
                    className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                    initial={{ scale: 0, rotate: -45, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0, rotate: 45, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                  >
                    <svg width="40" height="15" viewBox="0 0 40 15" fill="none" className="drop-shadow-md">
                      {/* Left Lens */}
                      <rect x="3" y="3" width="12" height="9" rx="2" fill="#0f172a" stroke="#ffffff" strokeWidth="1.2" />
                      <path d="M5 5H11" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
                      {/* Right Lens */}
                      <rect x="25" y="3" width="12" height="9" rx="2" fill="#0f172a" stroke="#ffffff" strokeWidth="1.2" />
                      <path d="M27 5H33" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
                      {/* Bridge */}
                      <rect x="15" y="5" width="10" height="2" fill="#0f172a" stroke="#ffffff" strokeWidth="0.5" />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
