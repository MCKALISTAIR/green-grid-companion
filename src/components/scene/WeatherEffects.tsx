import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud } from 'lucide-react';
import { WeatherData } from '@/hooks/useWeatherData';

interface WeatherEffectsProps {
  weather: WeatherData;
  isNight: boolean;
}

// Fog Layer Component
function FogLayer({ intensity = 0.5, layer = 1 }: { intensity?: number; layer?: number }) {
  const duration = 20 + layer * 10;
  const yOffset = layer * 15;

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
            hsl(0 0% 90% / ${intensity * 0.4}) ${30 + yOffset}%, 
            hsl(0 0% 85% / ${intensity * 0.6}) ${60 + yOffset}%, 
            hsl(0 0% 80% / ${intensity * 0.3}) 100%
          )`,
        }}
        animate={{ x: ['-5%', '5%', '-5%'] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

// Snowflake Component
function Snowflake({ delay, x, size = 'md' }: { delay: number; x: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 2, md: 4, lg: 6 };
  const pixelSize = sizes[size];
  const duration = 4 + Math.random() * 3;
  const drift = 20 + Math.random() * 30;

  return (
    <motion.div
      className="absolute rounded-full bg-card"
      style={{
        left: `${x}%`,
        width: pixelSize,
        height: pixelSize,
        filter: 'blur(0.5px)',
      }}
      initial={{ y: '-5%', opacity: 0 }}
      animate={{
        y: '110%',
        x: [`0px`, `${drift}px`, `${-drift}px`, `${drift / 2}px`],
        opacity: [0, 0.9, 0.9, 0],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

// Lightning Flash Component
function LightningFlash({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 0, 0.7, 0],
          }}
          transition={{
            duration: 0.3,
            times: [0, 0.1, 0.2, 0.25, 0.4],
          }}
          style={{
            background: 'linear-gradient(180deg, hsl(60 100% 95% / 0.4) 0%, hsl(60 100% 90% / 0.2) 50%, transparent 100%)',
          }}
        />
      )}
    </AnimatePresence>
  );
}

// Lightning Bolt SVG
function LightningBolt({ x, delay }: { x: number; delay: number }) {
  return (
    <motion.svg
      className="absolute pointer-events-none"
      style={{ left: `${x}%`, top: '5%' }}
      width="30"
      height="80"
      viewBox="0 0 30 80"
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 0.5,
        delay,
        repeat: Infinity,
        repeatDelay: 4 + Math.random() * 6,
      }}
    >
      <motion.path
        d="M15 0 L10 30 L18 30 L8 80 L20 40 L12 40 L20 0 Z"
        fill="hsl(60 100% 80%)"
        filter="drop-shadow(0 0 8px hsl(60 100% 70%))"
      />
    </motion.svg>
  );
}

// Weather-aware Clouds Component
function WeatherClouds({
  cloudCover,
  isRaining,
  isNight
}: {
  cloudCover: number;
  isRaining: boolean;
  isNight: boolean;
}) {
  const cloudCount = Math.ceil(cloudCover / 25); // 1-4 clouds based on coverage
  const cloudOpacity = isNight ? 0.4 : 0.7;
  const cloudColor = isRaining ? 'hsl(220 10% 50%)' : 'hsl(0 0% 95%)';

  const clouds = useMemo(() => {
    return Array.from({ length: cloudCount }, (_, i) => ({
      id: i,
      top: 15 + (i % 3) * 8, // Started at 5%, now 15% to clear status bar
      size: 16 + (i % 2) * 8,
      duration: 30 + i * 5,
      delay: -i * 8,
    }));
  }, [cloudCount]);

  return (
    <>
      {clouds.map((cloud) => (
        <motion.div
          key={cloud.id}
          className="absolute animate-cloud-drift"
          style={{
            top: `${cloud.top}%`,
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: cloudOpacity }}
          transition={{ duration: 1 }}
        >
          <Cloud
            style={{
              width: `${cloud.size * 4}px`,
              height: `${cloud.size * 2.5}px`,
              color: cloudColor,
              filter: isRaining ? 'brightness(0.7)' : 'none',
            }}
            aria-hidden="true"
          />
        </motion.div>
      ))}
    </>
  );
}

// Heavy Rain Component (different from carbon-based rain)
function HeavyRain({ intensity = 0.5 }: { intensity: number }) {
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

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {drops.map((drop) => (
        <motion.div
          key={drop.id}
          className="absolute w-0.5 rounded-full bg-gen-hydro/40"
          style={{
            left: `${drop.x}%`,
            height: drop.height,
          }}
          initial={{ y: '-10%', opacity: 0 }}
          animate={{ y: '110%', opacity: [0, 0.7, 0] }}
          transition={{
            duration: drop.duration,
            delay: drop.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </motion.div>
  );
}

// Main Weather Effects Component
export function WeatherEffects({ weather, isNight }: WeatherEffectsProps) {
  // Randomize lightning timing
  const lightningActive = useMemo(() => {
    if (!weather.isThunderstorm) return false;
    return true;
  }, [weather.isThunderstorm]);

  return (
    <>
      {/* Fog Effect */}
      <AnimatePresence>
        {weather.isFoggy && (
          <>
            <FogLayer intensity={0.6} layer={1} />
            <FogLayer intensity={0.4} layer={2} />
            <FogLayer intensity={0.3} layer={3} />
          </>
        )}
      </AnimatePresence>

      {/* Weather-based Clouds (in addition to carbon-based) */}
      {weather.cloudCover > 40 && (
        <WeatherClouds
          cloudCover={weather.cloudCover}
          isRaining={weather.isRaining}
          isNight={isNight}
        />
      )}

      {/* Rain Effect (weather-based, heavier than carbon rain) */}
      <AnimatePresence>
        {weather.isRaining && (
          <HeavyRain intensity={weather.precipitationIntensity} />
        )}
      </AnimatePresence>

      {/* Snow Effect */}
      <AnimatePresence>
        {weather.isSnowing && (
          <motion.div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: Math.floor(25 * weather.precipitationIntensity) + 15 }).map((_, i) => (
              <Snowflake
                key={i}
                delay={Math.random() * 5}
                x={Math.random() * 100}
                size={['sm', 'md', 'lg'][i % 3] as 'sm' | 'md' | 'lg'}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thunderstorm Effects */}
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

// Export sub-components for individual use
export { FogLayer, Snowflake, LightningFlash, LightningBolt, WeatherClouds, HeavyRain };
