import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { WeatherData } from '@/hooks/useWeatherData';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import { CLOUD_COLOURS } from '@/lib/artPalette';
import {
  CloudBank,
  FogVeil,
  RainCapsules,
  SceneCloud,
  UnknownWeatherCloudBank,
  WindStreaks,
} from './art/WeatherArt';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { hasCloudBank } from '@/lib/cloudBank';

interface WeatherEffectsProps {
  weather: WeatherData;
  isNight: boolean;
  cleanliness: number;
  timeOfDay?: TimeOfDay;
  /** sceneConfig.showWind (wind_speed_10m >= 25 km/h). */
  showWind?: boolean;
  /** BH-90: false when the weather is unknown (offline / Open-Meteo failed). */
  weatherKnown?: boolean;
  /**
   * BH-90: px from the scene top where clouds may start (hero text bottom + 34).
   * Used by the unknown-weather bank and, since the #185 review, the overcast bank.
   */
  cloudTopPx?: number;
  /**
   * BH-117: leave the full cloud bank out of the sky layer. City scenes draw it
   * in its own layer behind the skyline (SceneCloudBankLayer), so the castle,
   * London's landmarks and the neutral skyline sit in front of it.
   */
  omitBank?: boolean;
}

function FogLayer({
  intensity = 0.5,
  layer = 1,
  cleanliness = 0.5,
}: {
  intensity?: number;
  layer?: number;
  cleanliness?: number;
}) {
  const duration = 20 + layer * 10;
  const yOffset = layer * 15;
  const fogHue = cleanliness > 0.6 ? 190 : 40;
  const fogSaturation = cleanliness > 0.6 ? '20%' : '10%';
  const fogLightness = cleanliness > 0.6 ? (layer === 1 ? 95 : 90) : layer === 1 ? 80 : 75;

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: intensity * 0.8 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            transparent 0%, 
            hsl(${fogHue} ${fogSaturation} ${fogLightness}% / ${intensity * 0.4}) ${30 + yOffset}%, 
            hsl(${fogHue} ${fogSaturation} ${fogLightness - 5}% / ${intensity * 0.6}) ${60 + yOffset}%, 
            hsl(${fogHue} ${fogSaturation} ${fogLightness - 10}% / ${intensity * 0.3}) 100%
          )`,
        }}
        animate={{ x: ['-5%', '5%', '-5%'] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' as const }}
      />
    </motion.div>
  );
}

function Snowflake({
  delay,
  x,
  size = 'md',
}: {
  delay: number;
  x: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const reduced = useReducedMotion();
  const params = useMemo(() => {
    const sizes = { sm: 2, md: 4, lg: 6 };
    return {
      pixelSize: sizes[size],
      duration: 4 + Math.random() * 3,
      drift: 20 + Math.random() * 30,
    };
  }, [size]);

  // Falling particles are pure decoration; drop them under reduced motion.
  if (reduced) return null;

  return (
    <motion.div
      className="absolute rounded-full bg-card"
      style={{
        left: `${x}%`,
        width: params.pixelSize,
        height: params.pixelSize,
        filter: 'blur(0.5px)',
      }}
      initial={{ y: '-5%', opacity: 0 }}
      animate={{
        y: '110%',
        x: [`0px`, `${params.drift}px`, `${-params.drift}px`, `${params.drift / 2}px`],
        opacity: [0, 0.9, 0.9, 0],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration: params.duration,
        delay,
        repeat: Infinity,
        ease: 'linear' as const,
      }}
    />
  );
}

function LightningFlash({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0, 0.7, 0] }}
          transition={{ duration: 0.3, times: [0, 0.1, 0.2, 0.25, 0.4] }}
          style={{
            background:
              'linear-gradient(180deg, hsl(60 100% 95% / 0.4) 0%, hsl(60 100% 90% / 0.2) 50%, transparent 100%)',
          }}
        />
      )}
    </AnimatePresence>
  );
}

function LightningBolt({ x, delay }: { x: number; delay: number }) {
  const repeatDelay = useMemo(() => 4 + Math.random() * 6, []);

  return (
    <motion.svg
      className="absolute pointer-events-none"
      style={{ left: `${x}%`, top: '5%' }}
      width="30"
      height="80"
      viewBox="0 0 30 80"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.5, delay, repeat: Infinity, repeatDelay }}
    >
      <motion.path
        d="M15 0 L10 30 L18 30 L8 80 L20 40 L12 40 L20 0 Z"
        fill="hsl(60 100% 80%)"
        filter="drop-shadow(0 0 8px hsl(60 100% 70%))"
      />
    </motion.svg>
  );
}

function cloudPalette(timeOfDay: TimeOfDay | undefined, isNight: boolean) {
  if (isNight) return CLOUD_COLOURS.night;
  if (timeOfDay === 'sunset') return CLOUD_COLOURS.sunset;
  if (timeOfDay === 'dawn') return CLOUD_COLOURS.dawn;
  return CLOUD_COLOURS.day;
}

/** Light cloud (40-70%): ceil(cover/25) flat-based clouds. Full scene-width
 * drift from main (#133, `animate-cloud-drift`); static under reduced motion. */
function WeatherClouds({
  cloudCover,
  isNight,
  timeOfDay,
}: {
  cloudCover: number;
  isNight: boolean;
  timeOfDay?: TimeOfDay;
}) {
  const cloudCount = Math.min(4, Math.ceil(cloudCover / 25));
  const colours = cloudPalette(timeOfDay, isNight);
  const clouds = useMemo(
    () =>
      Array.from({ length: cloudCount }, (_, i) => ({
        id: i,
        top: 14 + (i % 3) * 9,
        // Static spot under reduced motion; the drift keyframes override `left`.
        left: 8 + ((i * 31) % 70),
        scale: [0.8, 0.6, 0.7, 0.55][i % 4],
        duration: 30 + i * 5,
        delay: -i * 8,
      })),
    [cloudCount],
  );
  return (
    <>
      {clouds.map((c) => (
        <motion.div
          key={c.id}
          className="absolute animate-cloud-drift"
          data-art-cloud
          style={{
            top: `${c.top}%`,
            left: `${c.left}%`,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isNight ? 0.85 : 0.95 }}
          transition={{ duration: 1.2 }}
        >
          <SceneCloud scale={c.scale * 1.4} colours={colours} />
        </motion.div>
      ))}
    </>
  );
}

function HeavyRain({
  intensity = 0.5,
  cleanliness = 0.5,
}: {
  intensity: number;
  cleanliness?: number;
}) {
  const dropCount = Math.floor(30 * intensity);

  const drops = useMemo(() => {
    return Array.from({ length: dropCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 0.5 + Math.random() * 0.3,
      height: 12 + Math.random() * 8,
    }));
  }, [dropCount]);

  const rainColor = cleanliness > 0.6 ? 'rgba(34, 197, 94, 0.45)' : 'rgba(100, 116, 139, 0.3)';

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      data-art-precip="rain"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {drops.map((drop) => (
        <motion.div
          key={drop.id}
          className="absolute w-0.5 rounded-full"
          style={{
            left: `${drop.x}%`,
            height: drop.height,
            backgroundColor: rainColor,
          }}
          initial={{ y: '-10%', opacity: 0 }}
          animate={{ y: '110%', opacity: [0, 0.7, 0] }}
          transition={{
            duration: drop.duration,
            delay: drop.delay,
            repeat: Infinity,
            ease: 'linear' as const,
          }}
        />
      ))}
    </motion.div>
  );
}

/** G-11: cross-fade length when the weather lands (matches .cloud-bank-in/out in index.css). */
export const CLOUD_BANK_FADE_MS = 400;

type BankKey = 'unknown' | 'night' | 'day';

/**
 * The full cloud bank for this weather, or nothing (see hasCloudBank).
 *
 * G-11 (Design, 30 Oct 2026): when the weather lands (unknown bank to the real
 * bank, or to no bank) the banks cross-fade in place over 400ms; nothing moves.
 * The fade is a CSS animation so it runs on the compositor while the page is busy
 * rendering the new data. Reduce Motion swaps them instantly. Callers keep this
 * mounted when there is no bank, so the outgoing bank can fade out.
 */
export function WeatherCloudBank({
  weather,
  isNight,
  timeOfDay,
  weatherKnown = true,
  cloudTopPx,
}: Pick<WeatherEffectsProps, 'weather' | 'isNight' | 'timeOfDay' | 'weatherKnown' | 'cloudTopPx'>) {
  const reduceMotion = useReducedMotion();
  const show = hasCloudBank(weather, weatherKnown);
  const key: BankKey | null = show ? (!weatherKnown ? 'unknown' : isNight ? 'night' : 'day') : null;
  // Both banks use the current cloudTopPx, so neither crosses the hero text (#179)
  // if the text block changes height as the data lands.
  const bankFor = (k: BankKey) =>
    k === 'unknown' ? (
      <UnknownWeatherCloudBank topPx={cloudTopPx} timeOfDay={timeOfDay} />
    ) : (
      <CloudBank night={k === 'night'} topPx={cloudTopPx} />
    );

  const firstKey = useRef(key);
  const prevKey = useRef(key);
  const [outgoing, setOutgoing] = useState<BankKey | null>(null);

  useLayoutEffect(() => {
    const was = prevKey.current;
    prevKey.current = key;
    if (was === key) return;
    if (reduceMotion || !was) {
      setOutgoing(null);
      return;
    }
    setOutgoing(was);
    // Cleared on animationend; this is only a fallback (tab hidden, no animations).
    const id = window.setTimeout(() => setOutgoing(null), CLOUD_BANK_FADE_MS * 4);
    return () => window.clearTimeout(id);
  }, [key, reduceMotion]);

  const fadeIn = !reduceMotion && key !== firstKey.current;
  // One keyed list, so the outgoing bank keeps its DOM (and measured width): only
  // its class changes, and it fades out under the incoming one.
  const layers: ReactNode[] = [];
  if (outgoing && outgoing !== key) {
    layers.push(
      <div
        key={outgoing}
        className="absolute inset-0 pointer-events-none cloud-bank-out"
        data-bank-fade="out"
        onAnimationEnd={() => setOutgoing(null)}
      >
        {bankFor(outgoing)}
      </div>,
    );
  }
  if (key) {
    layers.push(
      <div
        key={key}
        className={cn('absolute inset-0 pointer-events-none', fadeIn && 'cloud-bank-in')}
        data-bank-fade={fadeIn ? 'in' : 'none'}
      >
        {bankFor(key)}
      </div>,
    );
  }
  return <>{layers}</>;
}

export function WeatherEffects({
  weather,
  isNight,
  timeOfDay,
  showWind = false,
  weatherKnown = true,
  cloudTopPx,
  omitBank = false,
}: WeatherEffectsProps) {
  const lightningActive = useMemo(() => {
    if (!weather.isThunderstorm) return false;
    return true;
  }, [weather.isThunderstorm]);

  return (
    <>
      <AnimatePresence>{weather.isFoggy && <FogVeil />}</AnimatePresence>

      {!omitBank && (
        <WeatherCloudBank
          weather={weather}
          isNight={isNight}
          timeOfDay={timeOfDay}
          weatherKnown={weatherKnown}
          cloudTopPx={cloudTopPx}
        />
      )}
      {!hasCloudBank(weather, weatherKnown) && weather.cloudCover > 40 && (
        <WeatherClouds cloudCover={weather.cloudCover} isNight={isNight} timeOfDay={timeOfDay} />
      )}

      {showWind && (
        <div
          className="absolute left-[2%] top-[24%] w-[84px] art-wind [&_svg]:w-full [&_svg]:h-auto"
          data-art-wind
        >
          <WindStreaks opacity={0.9} />
        </div>
      )}

      <AnimatePresence>
        {weather.isRaining && <RainCapsules intensity={weather.precipitationIntensity} />}
      </AnimatePresence>

      <AnimatePresence>
        {weather.isSnowing && (
          <motion.div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            data-art-precip="snow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: Math.floor(25 * weather.precipitationIntensity) + 15 }).map(
              (_, i) => (
                <Snowflake
                  key={i}
                  delay={Math.random() * 5}
                  x={Math.random() * 100}
                  size={['sm', 'md', 'lg'][i % 3] as 'sm' | 'md' | 'lg'}
                />
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {weather.isThunderstorm && (
          <>
            <LightningFlash active={lightningActive} />
            <LightningBolt x={20 + Math.random() * 20} delay={1} />
            <LightningBolt x={60 + Math.random() * 20} delay={4} />
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export { FogLayer, Snowflake, LightningFlash, LightningBolt, WeatherClouds, HeavyRain };
