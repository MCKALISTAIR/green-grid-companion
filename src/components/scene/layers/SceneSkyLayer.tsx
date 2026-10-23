import { motion, AnimatePresence, type MotionValue } from 'framer-motion';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { WeatherData } from '@/hooks/useWeatherData';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { WeatherEffects } from '../WeatherEffects';
import { AuroraRibbon, SceneSun } from '../art/WeatherArt';
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
  /** BH-96: in synthwave the sun wears the sunglasses, statically. */
  synthwaveMode: boolean;
  /** BH-96: bumped on every sun tap; replays the small sun reaction. 0 = no tap yet. */
  sunReactionKey: number;
  handleMoonDoubleClick: () => void;
  /** BH-96: every tap on the sun (pointerup). The scene counts taps (useTapCount). */
  onSunTap: () => void;
  /** BH-90: where unknown-weather clouds may start (hero text bottom + 34). */
  cloudTopPx?: number;
}

export function SceneSkyLayer({
  skyY,
  shouldReduceMotion,
  weather,
  isNight,
  propIntensity: _propIntensity,
  sceneConfig,
  sunPosition,
  timeOfDay,
  synthwaveMode,
  sunReactionKey,
  handleMoonDoubleClick,
  onSunTap,
  cloudTopPx,
}: SceneSkyLayerProps) {
  return (
    <motion.div
      style={{ y: shouldReduceMotion ? 0 : skyY }}
      className="absolute inset-0 pointer-events-none z-[1]"
    >
      <WeatherEffects
        weather={weather}
        isNight={isNight}
        cleanliness={sceneConfig.cleanliness}
        timeOfDay={timeOfDay}
        showWind={sceneConfig.showWind}
        weatherKnown={sceneConfig.weatherKnown}
        cloudTopPx={cloudTopPx}
      />

      {/* Aurora for magically clean nights (Phase 1: cleanliness > 0.85) */}
      <AnimatePresence>
        {isNight && sceneConfig.cleanliness > 0.85 && weather.cloudCover < 60 && (
          <AuroraRibbon
            opacity={0.2 + 0.18 * Math.min(1, (sceneConfig.cleanliness - 0.85) / 0.15)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sceneConfig.showStars && <Stars count={40} visibility={sceneConfig.starVisibility} />}
      </AnimatePresence>

      <AnimatePresence>
        {sceneConfig.showMoon && (
          <Moon position={sunPosition} onDoubleClick={handleMoonDoubleClick} />
        )}
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
            data-scene-sun
            // Reduce Motion: appears in place, no scale-in (BH-96).
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{
              opacity: sceneConfig.cleanliness * 0.3 + 0.7,
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 1.5, ease: 'easeInOut' as const }}
            style={{
              // Position via style — Framer `animate` top/right % was resolving to 0px
              // and parking the sun mid-frame (and duplicating under grid capture).
              // Never above the trophy chip's bottom edge (top: safe-area + 0.5rem, 44px
              // tall), so the sun can't sit behind it on phones.
              top: `max(${
                timeOfDay === 'sunset'
                  ? '35%'
                  : timeOfDay === 'morning'
                    ? '15%'
                    : timeOfDay === 'afternoon'
                      ? '12%'
                      : '8%'
              }, calc(max(env(safe-area-inset-top), 24px) + 4.25rem))`,
              right: timeOfDay === 'sunset' ? '15%' : timeOfDay === 'morning' ? '20%' : '8%',
              left: 'auto',
              // BH-96 (brief Q1): no CSS filter on the sun; its colour comes from the art.
            }}
          >
            {/* BH-96 (Design brief Q1): decorative easter egg, so it is not a VoiceOver
                or keyboard control (aria-hidden, no role, no tabIndex, no key handler).
                No hover, press spring or endless float. The invisible 44x44 hit area
                is centred on the disc. */}
            <div
              className="cursor-pointer relative select-none touch-manipulation"
              aria-hidden="true"
              data-scene-sun-tap
              onPointerUp={onSunTap}
            >
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11"
                data-scene-sun-hit
              />
              {/* Small sun reaction: disc 1 -> 1.08 -> 1 and halo +0.15 over 320 ms
                  (ease.out). Reduce Motion: no scale or halo change. */}
              <motion.div
                key={sunReactionKey}
                className="relative z-10 pointer-events-none -m-11"
                data-sun-reaction={sunReactionKey > 0 && !shouldReduceMotion ? 'on' : 'off'}
                data-sun-reactions={sunReactionKey}
                initial={false}
                animate={
                  sunReactionKey > 0 && !shouldReduceMotion ? { scale: [1, 1.08, 1] } : { scale: 1 }
                }
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <SceneSun
                  r={timeOfDay === 'midday' ? 20 : 23}
                  tone={timeOfDay === 'sunset' ? 'sunset' : timeOfDay === 'dawn' ? 'dawn' : 'day'}
                />
                {sunReactionKey > 0 && !shouldReduceMotion && (
                  <motion.span
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100"
                    style={{ width: 128, height: 128 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.15, 0] }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </motion.div>

              {/* BH-96: in synthwave the sun wears the sunglasses, statically. */}
              {synthwaveMode && (
                <div
                  className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                  data-sun-sunglasses
                >
                  <svg width="40" height="15" viewBox="0 0 40 15" fill="none">
                    {/* Left Lens */}
                    <rect
                      x="3"
                      y="3"
                      width="12"
                      height="9"
                      rx="2"
                      fill="#0f172a"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                    <path d="M5 5H11" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
                    {/* Right Lens */}
                    <rect
                      x="25"
                      y="3"
                      width="12"
                      height="9"
                      rx="2"
                      fill="#0f172a"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                    <path d="M27 5H33" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
                    {/* Bridge */}
                    <rect
                      x="15"
                      y="5"
                      width="10"
                      height="2"
                      fill="#0f172a"
                      stroke="#ffffff"
                      strokeWidth="0.5"
                    />
                  </svg>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
