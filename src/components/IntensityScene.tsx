import { useMemo } from 'react';
import { Sun, Cloud, Factory, Leaf, Flame, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimeOfDay, TimeOfDay } from '@/hooks/useTimeOfDay';
import { Stars } from './scene/Stars';
import { Moon } from './scene/Moon';
import { Mountains } from './scene/Mountains';
import { Grass } from './scene/Grass';
import { Butterfly } from './scene/Butterfly';

interface IntensitySceneProps {
  intensity: number;
  index: string;
}

// Custom SVG components for better animations
function FlyingBird({ delay, duration, startX }: { delay: number; duration: number; startX: number }) {
  return (
    <motion.svg
      className="absolute w-8 h-8"
      initial={{ x: `${startX}%`, opacity: 0 }}
      animate={{ 
        x: ['0%', '120%'],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{ top: `${15 + Math.random() * 20}%` }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <motion.path
        d="M2 12 C6 8, 10 10, 12 12 C14 10, 18 8, 22 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-foreground/60"
        animate={{
          d: [
            "M2 12 C6 8, 10 10, 12 12 C14 10, 18 8, 22 12",
            "M2 12 C6 14, 10 12, 12 12 C14 12, 18 14, 22 12",
            "M2 12 C6 8, 10 10, 12 12 C14 10, 18 8, 22 12",
          ],
        }}
        transition={{
          duration: 0.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.svg>
  );
}

function WindTurbine({ scale = 1, speed = 4 }: { scale?: number; speed?: number }) {
  return (
    <motion.div 
      className="relative" 
      style={{ transform: `scale(${scale})` }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.6 }}
    >
      {/* Turbine pole */}
      <div className="w-1.5 h-20 bg-card/90 mx-auto rounded-sm" />
      {/* Nacelle (hub) */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-2 bg-card rounded-full" />
      {/* Red warning light for night */}
      <motion.div
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-destructive rounded-full"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {/* Rotating blades */}
      <svg
        className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <motion.g
          animate={{ rotate: 360 }}
          transition={{
            duration: speed,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ transformOrigin: '24px 24px' }}
        >
          {/* Three blades at 120° intervals */}
          <g className="fill-card/90">
            <ellipse cx="24" cy="8" rx="2.5" ry="14" />
            <ellipse cx="24" cy="8" rx="2.5" ry="14" transform="rotate(120 24 24)" />
            <ellipse cx="24" cy="8" rx="2.5" ry="14" transform="rotate(240 24 24)" />
          </g>
          {/* Center hub */}
          <circle cx="24" cy="24" r="3" className="fill-card" />
        </motion.g>
      </svg>
    </motion.div>
  );
}

function SmokeParticle({ delay, x }: { delay: number; x: number }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: `${x}%`, bottom: '70px' }}
      initial={{ y: 0, opacity: 0.6, scale: 0.5 }}
      animate={{ y: -60, opacity: 0, scale: 1.5 }}
      transition={{
        duration: 3,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    >
      <div className="w-6 h-6 rounded-full bg-secondary/40 blur-sm" />
    </motion.div>
  );
}

function RainDrop({ delay, x }: { delay: number; x: number }) {
  return (
    <motion.div
      className="absolute w-0.5 h-4 bg-gen-hydro/60 rounded-full"
      style={{ left: `${x}%` }}
      initial={{ y: '-10%', opacity: 0 }}
      animate={{ y: '110%', opacity: [0, 1, 0] }}
      transition={{
        duration: 0.8,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

function SunRay({ angle, delay }: { angle: number; delay: number }) {
  return (
    <motion.div
      className="absolute top-0 right-0 w-2 h-32 bg-gradient-to-b from-accent/40 to-transparent"
      style={{
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'top right',
      }}
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{
        duration: 3,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

export function IntensityScene({ intensity, index }: IntensitySceneProps) {
  const { timeOfDay, isNight, sunPosition } = useTimeOfDay();

  const sceneConfig = useMemo(() => {
    const cleanliness = Math.max(0, Math.min(1, 1 - (intensity - 50) / 300));

    return {
      cleanliness,
      skyGradient: getSkyGradient(index, timeOfDay, cleanliness),
      showRenewables: cleanliness > 0.5,
      showFactories: cleanliness < 0.5,
      showBirds: cleanliness > 0.6 && !isNight,
      showSmoke: cleanliness < 0.4,
      showRain: cleanliness < 0.35,
      showSunRays: cleanliness > 0.7 && !isNight,
      showStars: isNight && cleanliness > 0.3,
      showMoon: isNight,
      showButterflies: cleanliness > 0.8 && !isNight,
      turbineCount: Math.floor(cleanliness * 3) + 1,
      solarBrightness: cleanliness,
      birdCount: Math.floor(cleanliness * 4) + 1,
      starVisibility: cleanliness, // Pollution obscures stars
    };
  }, [intensity, index, timeOfDay, isNight]);

  return (
    <motion.div
      className="relative w-full h-[45vh] min-h-96 overflow-hidden rounded-b-3xl"
      animate={{ background: sceneConfig.skyGradient }}
      transition={{ duration: 2, ease: 'easeInOut' }}
    >
      {/* Stars for night time */}
      <AnimatePresence>
        {sceneConfig.showStars && (
          <Stars count={40} visibility={sceneConfig.starVisibility} />
        )}
      </AnimatePresence>

      {/* Moon for night time */}
      <AnimatePresence>
        {sceneConfig.showMoon && <Moon position={sunPosition} />}
      </AnimatePresence>

      {/* Sun Rays for clean energy */}
      <AnimatePresence>
        {sceneConfig.showSunRays && (
          <motion.div 
            className="absolute top-0 right-0 overflow-hidden w-48 h-48"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            {[...Array(5)].map((_, i) => (
              <SunRay key={i} angle={20 + i * 15} delay={i * 0.3} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sun with glow - hidden at night */}
      <AnimatePresence>
        {!isNight && (
          <motion.div
            className="absolute top-8 right-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: sceneConfig.cleanliness * 0.3 + 0.7,
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 1 }}
            style={{
              filter: `brightness(${sceneConfig.solarBrightness + 0.5})`,
            }}
          >
            {/* Sun glow effect */}
            <motion.div 
              className="absolute inset-0 w-20 h-20 -translate-x-2 -translate-y-2 bg-accent/30 rounded-full blur-xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <Sun className="w-16 h-16 text-accent relative z-10" aria-hidden="true" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rain effect for dirty energy */}
      <AnimatePresence>
        {sceneConfig.showRain && (
          <motion.div 
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {[...Array(20)].map((_, i) => (
              <RainDrop key={i} delay={Math.random() * 2} x={5 + (i * 4.5)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clouds with parallax movement */}
      <Cloud
        className="absolute top-12 w-24 h-14 text-card/80 animate-cloud-drift"
        style={{ animationDelay: '0s', animationDuration: '35s' }}
        aria-hidden="true"
      />
      <Cloud
        className="absolute top-20 w-16 h-10 text-card/60 animate-cloud-drift"
        style={{ animationDelay: '-12s', animationDuration: '45s' }}
        aria-hidden="true"
      />
      <Cloud
        className="absolute top-6 w-20 h-12 text-card/70 animate-cloud-drift"
        style={{ animationDelay: '-25s', animationDuration: '40s' }}
        aria-hidden="true"
      />

      {/* Extra pollution clouds for dirty energy */}
      <AnimatePresence>
        {sceneConfig.showSmoke && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            >
              <Cloud
                className="absolute top-8 w-28 h-16 text-secondary/50 animate-cloud-drift"
                style={{ animationDelay: '-5s', animationDuration: '25s' }}
                aria-hidden="true"
              />
              <Cloud
                className="absolute top-14 w-24 h-14 text-secondary/40 animate-cloud-drift"
                style={{ animationDelay: '-18s', animationDuration: '28s' }}
                aria-hidden="true"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Flying birds for clean energy */}
      <AnimatePresence>
        {sceneConfig.showBirds && (
          <motion.div 
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {[...Array(sceneConfig.birdCount)].map((_, i) => (
              <FlyingBird
                key={i}
                delay={i * 3}
                duration={8 + Math.random() * 4}
                startX={-10}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Butterflies for very clean energy */}
      <AnimatePresence>
        {sceneConfig.showButterflies && (
          <>
            <Butterfly startX={10} delay={0} />
            <Butterfly startX={50} delay={3} />
          </>
        )}
      </AnimatePresence>

      {/* Background Mountains with parallax */}
      <Mountains cleanliness={sceneConfig.cleanliness} />

      {/* Ground/Landscape */}
      <div className="absolute bottom-0 left-0 right-0">
        {/* Hills with gradient */}
        <svg
          viewBox="0 0 400 100"
          className="w-full h-28"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="hillGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop 
                offset="0%" 
                stopColor={sceneConfig.cleanliness > 0.5 ? 'hsl(142 40% 50%)' : 'hsl(30 25% 45%)'} 
              />
              <stop 
                offset="100%" 
                stopColor={sceneConfig.cleanliness > 0.5 ? 'hsl(142 50% 35%)' : 'hsl(30 30% 35%)'} 
              />
            </linearGradient>
          </defs>
          <motion.path
            d="M0,100 L0,55 Q40,25 100,45 Q160,65 220,40 Q280,15 340,50 Q380,75 400,35 L400,100 Z"
            fill="url(#hillGradient1)"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0.5 }}
          />
          <motion.path
            d="M0,100 L0,65 Q60,45 130,60 Q200,75 270,55 Q340,35 400,65 L400,100 Z"
            fill="url(#hillGradient1)"
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0.7 }}
          />
          <motion.path
            d="M0,100 L0,78 Q80,68 180,82 Q280,96 400,72 L400,100 Z"
            fill="url(#hillGradient1)"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0.9 }}
          />
        </svg>

        {/* Foreground Grass */}
        <Grass cleanliness={sceneConfig.cleanliness} windSpeed={sceneConfig.showRenewables ? 1.5 : 0.5} />

        {/* Wind Turbines for clean energy */}
        <AnimatePresence>
          {sceneConfig.showRenewables && (
            <motion.div 
              className="absolute bottom-20 left-0 right-0 flex justify-around px-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, staggerChildren: 0.1 }}
            >
              {Array.from({ length: sceneConfig.turbineCount }).map((_, i) => (
                <WindTurbine
                  key={i}
                  scale={0.7 + (i % 2) * 0.2}
                  speed={3 + i * 0.8}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Solar panels with reflection animation */}
        <AnimatePresence>
          {sceneConfig.showRenewables && !isNight && (
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
                      ease: 'easeInOut',
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
          {sceneConfig.showFactories && (
            <motion.div 
              className="absolute bottom-14 left-6 flex gap-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative">
                <Factory className="w-18 h-18 text-secondary" style={{ width: '4.5rem', height: '4.5rem' }} aria-hidden="true" />
                {/* Glowing windows at night */}
                {isNight && (
                  <motion.div
                    className="absolute bottom-3 left-4 w-2 h-2 bg-accent/70 rounded-sm"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
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
                  <Factory className="w-14 h-14 text-secondary/90" aria-hidden="true" />
                  {isNight && (
                    <motion.div
                      className="absolute bottom-2 left-3 w-1.5 h-1.5 bg-accent/60 rounded-sm"
                      animate={{ opacity: [0.4, 0.9, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
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
          {sceneConfig.cleanliness > 0.75 && !isNight && (
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
      </div>

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
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Droplets className="w-6 h-6 text-gen-hydro/60" aria-hidden="true" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Time-based sky gradient colors
const TIME_SKY_COLORS: Record<TimeOfDay, { start: string; mid: string; end: string }> = {
  night: { start: 'hsl(230 50% 15%)', mid: 'hsl(240 40% 20%)', end: 'hsl(250 30% 25%)' },
  dawn: { start: 'hsl(280 40% 35%)', mid: 'hsl(30 60% 55%)', end: 'hsl(45 50% 70%)' },
  morning: { start: 'hsl(200 80% 60%)', mid: 'hsl(195 70% 70%)', end: 'hsl(180 50% 75%)' },
  midday: { start: 'hsl(200 90% 55%)', mid: 'hsl(195 80% 65%)', end: 'hsl(150 60% 75%)' },
  afternoon: { start: 'hsl(200 70% 60%)', mid: 'hsl(190 60% 68%)', end: 'hsl(160 50% 72%)' },
  sunset: { start: 'hsl(30 70% 50%)', mid: 'hsl(20 80% 60%)', end: 'hsl(280 40% 45%)' },
  dusk: { start: 'hsl(260 50% 35%)', mid: 'hsl(270 45% 40%)', end: 'hsl(240 40% 30%)' },
};

// Intensity-based adjustments
const INTENSITY_ADJUSTMENTS: Record<string, { satMod: number; lightMod: number }> = {
  'very low': { satMod: 1.1, lightMod: 1.05 },
  'low': { satMod: 1.0, lightMod: 1.0 },
  'moderate': { satMod: 0.8, lightMod: 0.95 },
  'high': { satMod: 0.6, lightMod: 0.9 },
  'very high': { satMod: 0.4, lightMod: 0.85 },
};

function getSkyGradient(index: string, timeOfDay: TimeOfDay, cleanliness: number): string {
  const timeColors = TIME_SKY_COLORS[timeOfDay];
  const adjustment = INTENSITY_ADJUSTMENTS[index] || INTENSITY_ADJUSTMENTS['moderate'];
  
  // Blend time-based colors with cleanliness factor
  // Lower cleanliness = more muted, brownish tones
  const pollutionFactor = 1 - cleanliness;
  
  return `linear-gradient(180deg, ${timeColors.start} 0%, ${timeColors.mid} 40%, ${timeColors.end} 100%)`;
}

export function getSkyStartColor(index: string): string {
  const SKY_START_COLORS: Record<string, string> = {
    'very low': 'hsl(195 90% 55%)',
    'low': 'hsl(200 70% 60%)',
    'moderate': 'hsl(200 40% 65%)',
    'high': 'hsl(40 40% 60%)',
    'very high': 'hsl(25 35% 50%)',
  };
  return SKY_START_COLORS[index] || SKY_START_COLORS['moderate'];
}
