import { useMemo } from 'react';
import { Wind, Sun, Cloud, Zap, Factory, Bird, Leaf, Flame, Waves } from 'lucide-react';

interface IntensitySceneProps {
  intensity: number;
  index: string;
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
      showBirds: cleanliness > 0.7,
      showSmoke: cleanliness < 0.4,
      turbineCount: Math.floor(cleanliness * 3),
      solarBrightness: cleanliness,
    };
  }, [intensity, index]);

  return (
    <div 
      className="relative w-full h-80 overflow-hidden rounded-b-3xl"
      style={{ background: sceneConfig.skyGradient }}
    >
      {/* Sun/Moon based on cleanliness */}
      <div 
        className="absolute top-8 right-8 transition-all duration-1000"
        style={{ opacity: sceneConfig.cleanliness * 0.3 + 0.7 }}
      >
        <Sun 
          className="w-16 h-16 text-accent animate-pulse-glow" 
          style={{ 
            filter: `brightness(${sceneConfig.solarBrightness + 0.5})`,
          }}
        />
      </div>

      {/* Clouds - more for moderate, fewer for clean */}
      <Cloud 
        className="absolute top-12 left-8 w-20 h-12 text-card/80 animate-drift"
        style={{ animationDelay: '0s', animationDuration: '25s' }}
      />
      <Cloud 
        className="absolute top-20 left-1/4 w-16 h-10 text-card/60 animate-drift"
        style={{ animationDelay: '-10s', animationDuration: '30s' }}
      />
      {sceneConfig.showSmoke && (
        <>
          <Cloud 
            className="absolute top-8 left-1/2 w-24 h-14 text-secondary/50 animate-drift"
            style={{ animationDelay: '-5s', animationDuration: '20s' }}
          />
          <Cloud 
            className="absolute top-16 right-1/4 w-20 h-12 text-secondary/40 animate-drift"
            style={{ animationDelay: '-15s', animationDuration: '22s' }}
          />
        </>
      )}

      {/* Birds for clean energy */}
      {sceneConfig.showBirds && (
        <>
          <Bird 
            className="absolute top-24 left-1/3 w-6 h-6 text-foreground/70 animate-float"
            style={{ animationDelay: '0s' }}
          />
          <Bird 
            className="absolute top-28 left-[40%] w-4 h-4 text-foreground/60 animate-float"
            style={{ animationDelay: '0.5s' }}
          />
          <Bird 
            className="absolute top-20 left-[45%] w-5 h-5 text-foreground/65 animate-float"
            style={{ animationDelay: '1s' }}
          />
        </>
      )}

      {/* Ground/Landscape */}
      <div className="absolute bottom-0 left-0 right-0">
        {/* Hills */}
        <svg 
          viewBox="0 0 400 100" 
          className="w-full h-24"
          preserveAspectRatio="none"
        >
          <path 
            d="M0,100 L0,60 Q50,30 100,50 Q150,70 200,45 Q250,20 300,55 Q350,80 400,40 L400,100 Z"
            className={sceneConfig.cleanliness > 0.5 ? 'fill-primary/40' : 'fill-secondary/60'}
          />
          <path 
            d="M0,100 L0,70 Q80,50 150,65 Q220,80 280,60 Q340,40 400,70 L400,100 Z"
            className={sceneConfig.cleanliness > 0.5 ? 'fill-primary/60' : 'fill-secondary/70'}
          />
          <path 
            d="M0,100 L0,80 Q100,70 200,85 Q300,100 400,75 L400,100 Z"
            className={sceneConfig.cleanliness > 0.5 ? 'fill-primary/80' : 'fill-secondary/80'}
          />
        </svg>

        {/* Wind Turbines for clean energy */}
        {sceneConfig.showRenewables && (
          <div className="absolute bottom-16 left-0 right-0 flex justify-around px-8">
            {Array.from({ length: sceneConfig.turbineCount }).map((_, i) => (
              <div key={i} className="relative" style={{ animationDelay: `${i * 0.3}s` }}>
                {/* Turbine pole */}
                <div className="w-1 h-16 bg-card/80 mx-auto" />
                {/* Turbine blades */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                  <Wind 
                    className="w-10 h-10 text-card animate-spin-slow"
                    style={{ animationDuration: `${4 + i}s` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Solar panels for clean energy */}
        {sceneConfig.showRenewables && (
          <div className="absolute bottom-4 right-8 flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div 
                key={i} 
                className="w-6 h-4 bg-gen-solar/80 rounded-sm transform -skew-x-12 shadow-md"
                style={{ opacity: 0.7 + (sceneConfig.cleanliness * 0.3) }}
              />
            ))}
          </div>
        )}

        {/* Factories for dirty energy */}
        {sceneConfig.showFactories && (
          <div className="absolute bottom-12 left-8 flex gap-4">
            <div className="relative">
              <Factory className="w-16 h-16 text-secondary" />
              {sceneConfig.showSmoke && (
                <div className="absolute -top-4 left-1/2">
                  <div className="w-4 h-4 rounded-full bg-secondary/50 animate-smoke" />
                  <div className="w-3 h-3 rounded-full bg-secondary/40 animate-smoke" style={{ animationDelay: '0.5s' }} />
                </div>
              )}
            </div>
            {sceneConfig.cleanliness < 0.3 && (
              <div className="relative">
                <Factory className="w-12 h-12 text-secondary" />
                {sceneConfig.showSmoke && (
                  <div className="absolute -top-3 left-1/2">
                    <div className="w-3 h-3 rounded-full bg-secondary/40 animate-smoke" style={{ animationDelay: '0.3s' }} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Leaves floating for very clean */}
        {sceneConfig.cleanliness > 0.8 && (
          <>
            <Leaf className="absolute bottom-20 left-[20%] w-4 h-4 text-primary animate-float" style={{ animationDelay: '0.2s' }} />
            <Leaf className="absolute bottom-24 right-[30%] w-3 h-3 text-primary/80 animate-float" style={{ animationDelay: '0.8s' }} />
          </>
        )}

        {/* Fire/flames for very dirty */}
        {sceneConfig.cleanliness < 0.2 && (
          <Flame className="absolute bottom-8 left-20 w-6 h-6 text-destructive animate-pulse" />
        )}
      </div>

      {/* Water waves at bottom for hydro when clean */}
      {sceneConfig.cleanliness > 0.6 && (
        <Waves className="absolute bottom-2 right-24 w-8 h-8 text-gen-hydro/50 animate-float" />
      )}
    </div>
  );
}

function getSkyGradient(index: string): string {
  const gradients: Record<string, string> = {
    'very low': 'linear-gradient(180deg, hsl(195 90% 55%) 0%, hsl(195 80% 70%) 40%, hsl(150 60% 75%) 100%)',
    'low': 'linear-gradient(180deg, hsl(200 70% 60%) 0%, hsl(190 60% 70%) 40%, hsl(140 50% 75%) 100%)',
    'moderate': 'linear-gradient(180deg, hsl(200 40% 65%) 0%, hsl(180 35% 70%) 40%, hsl(100 30% 75%) 100%)',
    'high': 'linear-gradient(180deg, hsl(40 40% 60%) 0%, hsl(35 45% 65%) 40%, hsl(30 35% 70%) 100%)',
    'very high': 'linear-gradient(180deg, hsl(25 35% 50%) 0%, hsl(20 40% 55%) 40%, hsl(15 30% 60%) 100%)',
  };
  return gradients[index] || gradients['moderate'];
}