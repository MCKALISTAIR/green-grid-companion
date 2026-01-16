import { useMemo } from 'react';
import { Sun, Cloud, Factory, Leaf, Flame, Droplets } from 'lucide-react';

interface IntensitySceneProps {
  intensity: number;
  index: string;
}

// Custom SVG components for better animations
function FlyingBird({ delay, duration, startX }: { delay: number; duration: number; startX: number }) {
  return (
    <svg
      className="absolute w-8 h-8 animate-bird-fly"
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        left: `${startX}%`,
        top: `${15 + Math.random() * 20}%`
      }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 12 C6 8, 10 10, 12 12 C14 10, 18 8, 22 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-foreground/60 animate-bird-wings"
        style={{ animationDuration: '0.3s' }}
      />
    </svg>
  );
}

function WindTurbine({ scale = 1, speed = 4 }: { scale?: number; speed?: number }) {
  return (
    <div className="relative" style={{ transform: `scale(${scale})` }}>
      {/* Turbine pole */}
      <div className="w-1.5 h-20 bg-card/90 mx-auto rounded-sm" />
      {/* Nacelle (hub) */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-2 bg-card rounded-full" />
      {/* Rotating blades */}
      <svg
        className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <g
          className="animate-spin"
          style={{
            animationDuration: `${speed}s`,
            animationTimingFunction: 'linear',
            transformOrigin: '24px 24px'
          }}
        >
          {/* Three blades at 120° intervals */}
          <g className="fill-card/90">
            <ellipse cx="24" cy="8" rx="2.5" ry="14" />
            <ellipse cx="24" cy="8" rx="2.5" ry="14" transform="rotate(120 24 24)" />
            <ellipse cx="24" cy="8" rx="2.5" ry="14" transform="rotate(240 24 24)" />
          </g>
          {/* Center hub */}
          <circle cx="24" cy="24" r="3" className="fill-card" />
        </g>
      </svg>
    </div>
  );
}

function SmokeParticle({ delay, x }: { delay: number; x: number }) {
  return (
    <div
      className="absolute animate-smoke-rise"
      style={{
        left: `${x}%`,
        animationDelay: `${delay}s`,
        bottom: '70px'
      }}
    >
      <div className="w-6 h-6 rounded-full bg-secondary/40 blur-sm" />
    </div>
  );
}

function RainDrop({ delay, x }: { delay: number; x: number }) {
  return (
    <div
      className="absolute w-0.5 h-4 bg-gen-hydro/60 rounded-full animate-rain"
      style={{
        left: `${x}%`,
        animationDelay: `${delay}s`,
        animationDuration: '0.8s'
      }}
    />
  );
}

function SunRay({ angle, delay }: { angle: number; delay: number }) {
  return (
    <div
      className="absolute top-0 right-0 w-2 h-32 bg-gradient-to-b from-accent/40 to-transparent animate-sun-ray"
      style={{
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'top right',
        animationDelay: `${delay}s`
      }}
    />
  );
}

export function IntensityScene({ intensity, index }: IntensitySceneProps) {
  const sceneConfig = useMemo(() => {
    // Calculate cleanliness (0 = dirty, 1 = clean)
    const cleanliness = Math.max(0, Math.min(1, 1 - (intensity - 50) / 300));

    return {
      cleanliness,
      skyGradient: getSkyGradient(index),
      showRenewables: cleanliness > 0.5,
      showFactories: cleanliness < 0.5,
      showBirds: cleanliness > 0.6,
      showSmoke: cleanliness < 0.4,
      showRain: cleanliness < 0.35,
      showSunRays: cleanliness > 0.7,
      turbineCount: Math.floor(cleanliness * 3) + 1,
      solarBrightness: cleanliness,
      birdCount: Math.floor(cleanliness * 4) + 1,
    };
  }, [intensity, index]);

  return (
    <div
      className="relative w-full h-[45vh] min-h-96 overflow-hidden rounded-b-3xl"
      style={{ background: sceneConfig.skyGradient }}
    >
      {/* Sun Rays for clean energy */}
      {sceneConfig.showSunRays && (
        <div className="absolute top-0 right-0 overflow-hidden w-48 h-48">
          {[...Array(5)].map((_, i) => (
            <SunRay key={i} angle={20 + i * 15} delay={i * 0.3} />
          ))}
        </div>
      )}

      {/* Sun with glow */}
      <div
        className="absolute top-8 right-8 transition-all duration-1000"
        style={{ opacity: sceneConfig.cleanliness * 0.3 + 0.7 }}
      >
        <div
          className="relative"
          style={{
            filter: `brightness(${sceneConfig.solarBrightness + 0.5})`,
          }}
        >
          {/* Sun glow effect */}
          <div className="absolute inset-0 w-20 h-20 -translate-x-2 -translate-y-2 bg-accent/30 rounded-full blur-xl animate-pulse" />
          <Sun className="w-16 h-16 text-accent animate-pulse-glow relative z-10" aria-hidden="true" />
        </div>
      </div>

      {/* Rain effect for dirty energy */}
      {sceneConfig.showRain && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <RainDrop
              key={i}
              delay={Math.random() * 2}
              x={5 + (i * 4.5)}
            />
          ))}
        </div>
      )}

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
      {sceneConfig.showSmoke && (
        <>
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
        </>
      )}

      {/* Flying birds for clean energy */}
      {sceneConfig.showBirds && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(sceneConfig.birdCount)].map((_, i) => (
            <FlyingBird
              key={i}
              delay={i * 3}
              duration={8 + Math.random() * 4}
              startX={-10}
            />
          ))}
        </div>
      )}

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
              <stop offset="0%" className={sceneConfig.cleanliness > 0.5 ? 'stop-color-primary-light' : 'stop-color-secondary-light'} stopColor={sceneConfig.cleanliness > 0.5 ? 'hsl(142 40% 50%)' : 'hsl(30 25% 45%)'} />
              <stop offset="100%" className={sceneConfig.cleanliness > 0.5 ? 'stop-color-primary' : 'stop-color-secondary'} stopColor={sceneConfig.cleanliness > 0.5 ? 'hsl(142 50% 35%)' : 'hsl(30 30% 35%)'} />
            </linearGradient>
          </defs>
          <path
            d="M0,100 L0,55 Q40,25 100,45 Q160,65 220,40 Q280,15 340,50 Q380,75 400,35 L400,100 Z"
            fill="url(#hillGradient1)"
            opacity="0.5"
          />
          <path
            d="M0,100 L0,65 Q60,45 130,60 Q200,75 270,55 Q340,35 400,65 L400,100 Z"
            fill="url(#hillGradient1)"
            opacity="0.7"
          />
          <path
            d="M0,100 L0,78 Q80,68 180,82 Q280,96 400,72 L400,100 Z"
            fill="url(#hillGradient1)"
            opacity="0.9"
          />
        </svg>

        {/* Wind Turbines for clean energy */}
        {sceneConfig.showRenewables && (
          <div className="absolute bottom-20 left-0 right-0 flex justify-around px-12">
            {Array.from({ length: sceneConfig.turbineCount }).map((_, i) => (
              <WindTurbine
                key={i}
                scale={0.7 + (i % 2) * 0.2}
                speed={3 + i * 0.8}
              />
            ))}
          </div>
        )}

        {/* Solar panels with reflection animation */}
        {sceneConfig.showRenewables && (
          <div className="absolute bottom-6 right-6 flex gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="relative w-7 h-5 bg-gen-solar/80 rounded-sm transform -skew-x-12 shadow-md overflow-hidden"
                style={{ opacity: 0.7 + (sceneConfig.cleanliness * 0.3) }}
              >
                {/* Reflection shimmer */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"
                  style={{ animationDelay: `${i * 0.5}s` }}
                />
                {/* Panel grid lines */}
                <div className="absolute inset-0 grid grid-cols-2 gap-px opacity-50">
                  <div className="border-r border-gen-solar/50" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Factories for dirty energy */}
        {sceneConfig.showFactories && (
          <div className="absolute bottom-14 left-6 flex gap-6">
            <div className="relative">
              <Factory className="w-18 h-18 text-secondary" style={{ width: '4.5rem', height: '4.5rem' }} aria-hidden="true" />
              {/* Animated smoke stacks */}
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
              <div className="relative">
                <Factory className="w-14 h-14 text-secondary/90" aria-hidden="true" />
                {sceneConfig.showSmoke && (
                  <>
                    <SmokeParticle delay={0.3} x={35} />
                    <SmokeParticle delay={1.1} x={45} />
                    <SmokeParticle delay={0.7} x={55} />
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Floating leaves for very clean */}
        {sceneConfig.cleanliness > 0.75 && (
          <>
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
          </>
        )}

        {/* Fire/flames for very dirty with flicker */}
        {sceneConfig.cleanliness < 0.2 && (
          <div className="absolute bottom-10 left-24 flex gap-2">
            <Flame className="w-7 h-7 text-destructive animate-flame" aria-hidden="true" />
            <Flame className="w-5 h-5 text-destructive/80 animate-flame" style={{ animationDelay: '0.15s' }} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Water/hydro indicator for clean energy */}
      {sceneConfig.cleanliness > 0.6 && (
        <div className="absolute bottom-3 right-20">
          <Droplets className="w-6 h-6 text-gen-hydro/60 animate-water-ripple" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

const SKY_START_COLORS: Record<string, string> = {
  'very low': 'hsl(195 90% 55%)',
  'low': 'hsl(200 70% 60%)',
  'moderate': 'hsl(200 40% 65%)',
  'high': 'hsl(40 40% 60%)',
  'very high': 'hsl(25 35% 50%)',
};

export function getSkyStartColor(index: string): string {
  return SKY_START_COLORS[index] || SKY_START_COLORS['moderate'];
}

export function getSkyGradient(index: string): string {
  const gradients: Record<string, string> = {
    'very low': 'linear-gradient(180deg, hsl(195 90% 55%) 0%, hsl(195 80% 70%) 40%, hsl(150 60% 75%) 100%)',
    'low': 'linear-gradient(180deg, hsl(200 70% 60%) 0%, hsl(190 60% 70%) 40%, hsl(140 50% 75%) 100%)',
    'moderate': 'linear-gradient(180deg, hsl(200 40% 65%) 0%, hsl(180 35% 70%) 40%, hsl(100 30% 75%) 100%)',
    'high': 'linear-gradient(180deg, hsl(40 40% 60%) 0%, hsl(35 45% 65%) 40%, hsl(30 35% 70%) 100%)',
    'very high': 'linear-gradient(180deg, hsl(25 35% 50%) 0%, hsl(20 40% 55%) 40%, hsl(15 30% 60%) 100%)',
  };
  return gradients[index] || gradients['moderate'];
}
