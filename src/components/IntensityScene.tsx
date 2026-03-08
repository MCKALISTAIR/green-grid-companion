
import { Sun, Cloud, Leaf, Flame, Droplets } from 'lucide-react';
import { SimpleFactory } from './scene/SimpleFactory';
import { useHaptics } from '@/hooks/useHaptics';
import { NotificationType } from '@capacitor/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useMemo, useId, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimeOfDay, TimeOfDay } from '@/hooks/useTimeOfDay';
import { useWeatherData, WeatherData } from '@/hooks/useWeatherData';
import { Stars } from './scene/Stars';
import { Moon } from './scene/Moon';
import { Landscape, LandscapeBack, LandscapeMid, LandscapeFront } from './scene/Landscape';
import { Butterfly } from './scene/Butterfly';
import { Sheep } from './scene/Sheep';
import { WeatherEffects } from './scene/WeatherEffects';
import { UFO, ElectricDrone, SteamTrain } from './scene/CarrotEvents';
import { NuclearCoolingTower } from './scene/NuclearCoolingTower';
import { OffshoreWind } from './scene/OffshoreWind';
import { TidalWaves } from './scene/TidalWaves';
import { Rainbow } from './scene/Rainbow';
import { PollutionWarning } from './scene/PollutionWarning';
import { NetZeroCelebration } from './scene/NetZeroCelebration';
import { Bee } from './scene/Bee';
import { Rabbit } from './scene/Rabbit';
import { Owl } from './scene/Owl';
import { Fox } from './scene/Fox';
import { Flowers } from './scene/Flowers';
import { ForegroundGrass } from './scene/ForegroundGrass';
import { BackgroundMountains } from './scene/BackgroundMountains';
import { AuroraBorealis } from './scene/AuroraBorealis';
import { EVChargingStation } from './scene/EVChargingStation';
import { HydroDam } from './scene/HydroDam';
import { TrendArrows } from './scene/TrendArrows';
import { MeteorShower } from './scene/MeteorShower';
import { BiomassSmoke } from './scene/BiomassSmoke';
import { FlyingBird } from './scene/FlyingBird';
import { WindTurbine } from './scene/WindTurbine';
import { SmokeParticle } from './scene/SmokeParticle';
import { RainDrop } from './scene/RainDrop';
import { SunRay } from './scene/SunRay';
import { Firefly } from './scene/Firefly';
import { SnowGround, FrozenPond, BreathMist, SnowOnPanels } from './scene/WinterElements';
import { useAchievements } from '@/hooks/useAchievements';
import { useSceneDirector } from '@/hooks/useSceneDirector';

import { GenerationMix } from '@/lib/carbonApi';
import { getSkyGradient } from '@/lib/sceneUtils';
import { getTurbineBottomPct } from '@/lib/sceneUtils';

interface IntensitySceneProps {
  intensity: number;
  index: string;
  generationMix?: GenerationMix[];
  isVintage?: boolean;
  className?: string;
}


export function IntensityScene({ intensity: propIntensity, index: propIndex, generationMix = [], isVintage = false, className }: IntensitySceneProps) {
  const { timeOfDay: realTimeOfDay, isNight: realIsNight, sunPosition: realSunPosition } = useTimeOfDay();
  const { weather: realWeather } = useWeatherData();
  const { unlock } = useAchievements();
  // ...
  const { active: isDirectorMode, overrides } = useSceneDirector();
  const { impactMedium, notification } = useHaptics();
  const shouldReduceMotion = useReducedMotion();

  // ... (timeOfDay, isNight, etc.)

  // Helper to determine active time of day (override or real)
  const timeOfDay = (isDirectorMode && overrides.timeOfDay) ? overrides.timeOfDay : realTimeOfDay;

  const isNight = (isDirectorMode && overrides.timeOfDay)
    ? (overrides.timeOfDay === 'night' || overrides.timeOfDay === 'dusk' || overrides.timeOfDay === 'dawn')
    : realIsNight;

  // Override Weather - wrapped in useMemo to prevent dependency issues
  const weather = useMemo(() => {
    return (isDirectorMode && overrides.weather) ? { ...realWeather, ...overrides.weather } : realWeather;
  }, [isDirectorMode, overrides.weather, realWeather]);

  const [synthwaveMode, setSynthwaveMode] = useState(false);

  // Apply Intensity Override
  const intensity = (isDirectorMode && overrides.intensity !== undefined) ? overrides.intensity : propIntensity;

  const index = (isDirectorMode && overrides.intensity !== undefined)
    ? (overrides.intensity < 50 ? 'very low' : overrides.intensity < 150 ? 'low' : overrides.intensity < 250 ? 'moderate' : overrides.intensity < 350 ? 'high' : 'very high')
    : propIndex;

  const sunPosition = realSunPosition;

  // Check if user has seen the scene intro during this session
  const [hasSeenScene, setHasSeenScene] = useState(() => {
    return sessionStorage.getItem('hasSeenScene') === 'true';
  });

  useEffect(() => {
    if (!hasSeenScene) {
      sessionStorage.setItem('hasSeenScene', 'true');
      setHasSeenScene(true);
    }
  }, [hasSeenScene]);

  const birdConfig = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      top: 10 + Math.random() * 30,
      delay: i * 5,
      duration: 15 + Math.random() * 10,
      scale: 0.6 + Math.random() * 0.4
    }));
  }, []);

  const fireflyConfig = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      delay: i * 0.5,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 40
    }));
  }, []);

  const rainConfig = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 2,
      x: 5 + (i * 4.5)
    }));
  }, []);

  const { isRaining } = weather;

  const [activeEvent, setActiveEvent] = useState<'none' | 'ufo' | 'drone' | 'train'>('none');
  const [turbineOverdrive, setTurbineOverdrive] = useState<number | null>(null);

  // Random Event Trigger
  useEffect(() => {
    const triggerRandomEvent = () => {
      if (activeEvent !== 'none') return;
      const rand = Math.random();
      if (isNight && rand > 0.7) setActiveEvent('ufo');
      else if (timeOfDay !== 'night' && timeOfDay !== 'dusk' && intensity < 100 && rand > 0.6) setActiveEvent('drone');
      else if (intensity > 200 && rand > 0.6) setActiveEvent('train');
    };
    const interval = setInterval(triggerRandomEvent, 20000);
    return () => clearInterval(interval);
  }, [activeEvent, isNight, intensity, timeOfDay]);

  const handleTurbineClick = (i: number) => {
    setTurbineOverdrive(i);
    setTimeout(() => setTurbineOverdrive(null), 2000);
  };

  const getGenerationPercentage = (fuel: string) => {
    const mix = generationMix.find(m => m.fuel.toLowerCase() === fuel.toLowerCase());
    return mix?.perc || 0;
  };

  const nuclearPercentage = getGenerationPercentage('nuclear');
  const windPercentage = getGenerationPercentage('wind');
  const hydroPercentage = getGenerationPercentage('hydro');
  const marinePercentage = generationMix.find(m =>
    m.fuel.toLowerCase().includes('marine') || m.fuel.toLowerCase().includes('tidal')
  )?.perc || 0;

  // Dynamic turbine layout: positions vary by depth layer, count driven by wind %
  const turbineLayout = useMemo(() => {
    // Turbine slots defined by layer + left%.
    // Bottom% is computed dynamically from the actual hill Bézier curves
    // via getTurbineBottomPct(), so they always sit on the ridge line
    // even if the hill paths or container height change.
    const CONTAINER_PCT = 85; // must match h-[85%] on landscape container
    const allSlots = [
      // Background turbines – on back hill ridge
      { left: 18, scale: 0.35, z: 1, layer: 'back' as const },
      { left: 25, scale: 0.30, z: 1, layer: 'back' as const },
      { left: 92, scale: 0.32, z: 1, layer: 'back' as const },
      // Mid-ground turbines – on mid hill ridge
      { left: 50, scale: 0.55, z: 15, layer: 'mid' as const },
      { left: 60, scale: 0.50, z: 15, layer: 'mid' as const },
      { left: 72, scale: 0.52, z: 15, layer: 'mid' as const },
      // Foreground turbines – on front hill ridge
      { left: 30, scale: 0.80, z: 25, layer: 'front' as const },
      { left: 45, scale: 0.75, z: 25, layer: 'front' as const },
    ].map(slot => ({
      ...slot,
      bottom: getTurbineBottomPct(slot.layer, slot.left, CONTAINER_PCT, -1),
    }));

    // How many turbines to show based on wind percentage
    let count: number;
    if (windPercentage <= 0) count = 2;
    else if (windPercentage < 5) count = 2;
    else if (windPercentage < 15) count = Math.min(4, 2 + Math.floor(windPercentage / 5));
    else if (windPercentage < 25) count = Math.min(6, 4 + Math.floor((windPercentage - 15) / 5));
    else count = allSlots.length;

    // Pick slots: always include one from each visible layer, then fill
    const picked: typeof allSlots = [];
    const byLayer = { front: allSlots.filter(s => s.layer === 'front'), mid: allSlots.filter(s => s.layer === 'mid'), back: allSlots.filter(s => s.layer === 'back') };

    if (count >= 1) picked.push(byLayer.front[0]);
    if (count >= 2) picked.push(byLayer.mid[0]);

    const remaining = allSlots.filter(s => !picked.includes(s));
    for (let i = 0; i < Math.min(count - picked.length, remaining.length); i++) {
      picked.push(remaining[i]);
    }

    return picked;
  }, [windPercentage]);

  const [showFox, setShowFox] = useState(false);
  const isDawnOrDusk = timeOfDay === 'dawn' || timeOfDay === 'dusk';

  useEffect(() => {
    if (!isDawnOrDusk || showFox) return;
    const foxInterval = setInterval(() => {
      if (Math.random() > 0.99) {
        setShowFox(true);
        setTimeout(() => setShowFox(false), 12000);
      }
    }, 30000);
    return () => clearInterval(foxInterval);
  }, [isDawnOrDusk, showFox]);

  const [showMeteorShower, setShowMeteorShower] = useState(false);

  const handleMoonDoubleClick = () => {
    notification(NotificationType.Success);
    setShowMeteorShower(true);
    setTimeout(() => setShowMeteorShower(false), 8000);
  };

  const biomassPercentage = getGenerationPercentage('biomass');

  const sceneConfig = useMemo(() => {
    const cleanliness = Math.max(0, Math.min(1, 1 - (intensity - 50) / 300));
    const weatherReducesBirds = weather.isRaining || weather.isSnowing || weather.isThunderstorm;
    const weatherReducesButterflies = weather.isRaining || weather.isSnowing || weather.isFoggy || weather.isThunderstorm;

    // Time-of-day aware visibility flags
    const isDaytime = timeOfDay === 'morning' || timeOfDay === 'midday' || timeOfDay === 'afternoon';
    const isGoldenHour = timeOfDay === 'sunset' || timeOfDay === 'dawn';
    const isDarkPeriod = timeOfDay === 'night' || timeOfDay === 'dusk';
    const showSun = isDaytime || timeOfDay === 'sunset'; // Sun visible during day + sunset, hidden at dusk/night/dawn(pre-sunrise)

    // Time-based scene filter for atmospheric lighting
    const getTimeFilter = () => {
      if (synthwaveMode) return 'contrast(1.2) saturate(1.5) hue-rotate(-10deg)';
      const baseContrast = 0.8 + cleanliness * 0.4;
      const baseSaturation = 0.7 + cleanliness * 0.5;
      const baseSepia = Math.max(0, (0.5 - cleanliness) * 0.5);
      switch (timeOfDay) {
        case 'dawn':
          return `contrast(${baseContrast * 0.95}) saturate(${baseSaturation * 1.1}) sepia(${baseSepia + 0.08}) hue-rotate(-5deg) brightness(0.9)`;
        case 'morning':
          return `contrast(${baseContrast}) saturate(${baseSaturation * 1.05}) sepia(${baseSepia}) brightness(1.0)`;
        case 'midday':
          return `contrast(${baseContrast * 1.05}) saturate(${baseSaturation}) sepia(${baseSepia}) brightness(1.05)`;
        case 'afternoon':
          return `contrast(${baseContrast}) saturate(${baseSaturation * 1.08}) sepia(${baseSepia + 0.03}) hue-rotate(-2deg)`;
        case 'sunset':
          return `contrast(${baseContrast * 0.95}) saturate(${baseSaturation * 1.2}) sepia(${baseSepia + 0.12}) hue-rotate(-8deg) brightness(0.92)`;
        case 'dusk':
          return `contrast(${baseContrast * 0.9}) saturate(${baseSaturation * 0.85}) sepia(${baseSepia + 0.05}) hue-rotate(5deg) brightness(0.8)`;
        case 'night':
          return `contrast(${baseContrast * 0.85}) saturate(${baseSaturation * 0.7}) brightness(0.75) hue-rotate(10deg)`;
        default:
          return `contrast(${baseContrast}) saturate(${baseSaturation}) sepia(${baseSepia})`;
      }
    };

    return {
      cleanliness,
      skyGradient: synthwaveMode
        ? 'linear-gradient(180deg, #2b1055 0%, #7597de 100%)'
        : getSkyGradient(index, timeOfDay, cleanliness, weather),
      showRenewables: cleanliness > 0.25,
      showFactories: cleanliness < 0.85,
      showBirds: cleanliness > 0.6 && isDaytime && !weatherReducesBirds,
      showSmoke: cleanliness < 0.5,
      showRain: cleanliness < 0.35 && !weather.isRaining,
      showSunRays: cleanliness > 0.7 && (timeOfDay === 'morning' || timeOfDay === 'midday' || timeOfDay === 'afternoon') && weather.cloudCover < 60 && !weather.isRaining,
      showStars: (isDarkPeriod || timeOfDay === 'dawn') && cleanliness > 0.3 && weather.cloudCover < 70,
      showMoon: isDarkPeriod && weather.cloudCover < 80,
      showSun,
      showButterflies: cleanliness > 0.9 && isDaytime && !weatherReducesButterflies,
      showFireflies: (isDarkPeriod || timeOfDay === 'sunset') && cleanliness > 0.8 && !weather.isRaining,
      isGoldenHour,
      isDaytime,
      isDarkPeriod,
      turbineCount: Math.max(1, Math.floor(cleanliness * 4)), // legacy, kept for compat
      factoryOpacity: Math.max(0, 1 - cleanliness),
      solarBrightness: cleanliness * (weather.cloudCover < 50 ? 1 : 0.6) * (isDaytime ? 1 : isGoldenHour ? 0.6 : 0.2),
      birdCount: Math.floor(cleanliness * 4) + 1,
      starVisibility: cleanliness * (1 - weather.cloudCover / 100) * (timeOfDay === 'night' ? 1 : timeOfDay === 'dusk' ? 0.6 : 0.3),
      windSpeed: weather.windSpeed,
      sceneFilter: getTimeFilter(),
    };
  }, [intensity, index, timeOfDay, weather, synthwaveMode]);

  return (
    <motion.div
      className={`relative w-full min-h-[380px] h-[50vh] md:h-[55vh] overflow-hidden rounded-xl md:rounded-l-xl transition-colors duration-1000 ${isVintage ? 'sepia-[.6] contrast-125 grayscale-[.3]' : ''} ${className || ''}`}
      animate={{
        background: sceneConfig.skyGradient,
        filter: sceneConfig.sceneFilter,
      }}
      transition={{ duration: 2, ease: 'easeInOut' }}
      role="img"
      aria-label={`Animated landscape representing ${index} carbon intensity`}
    >
      {isVintage && (
        <div className="absolute inset-0 z-50 pointer-events-none opacity-20 mix-blend-overlay"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
        />
      )}


      <WeatherEffects weather={weather} isNight={isNight} />
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

      <AnimatePresence>
        {sceneConfig.showSun && (
          <motion.div
            className="absolute z-20 pointer-events-auto"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: sceneConfig.cleanliness * 0.3 + 0.7,
              scale: 1,
              // Position sun based on time: low at sunrise/sunset, high at midday
              top: timeOfDay === 'sunset' ? '35%' : timeOfDay === 'morning' ? '15%' : timeOfDay === 'afternoon' ? '12%' : '8%',
              right: timeOfDay === 'sunset' ? '15%' : timeOfDay === 'morning' ? '20%' : '8%',
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            style={{
              filter: `brightness(${sceneConfig.solarBrightness + 0.5})`,
            }}
          >
            <div
              className="cursor-pointer active:scale-90 transition-transform relative"
              role="button"
              tabIndex={0}
              aria-label={`Toggle synthwave mode ${synthwaveMode ? 'off' : 'on'}`}
              onClick={() => {
                impactMedium();
                setSynthwaveMode(!synthwaveMode);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  impactMedium();
                  setSynthwaveMode(!synthwaveMode);
                }
              }}
            >
              <motion.div
                className="absolute inset-0 w-20 h-20 -translate-x-2 -translate-y-2 rounded-full blur-xl pointer-events-none"
                style={{
                  backgroundColor: timeOfDay === 'sunset' ? 'hsl(30 90% 55% / 0.4)' : 'hsl(var(--accent) / 0.3)',
                }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <Sun
                className={`w-16 h-16 relative z-10 pointer-events-none ${timeOfDay === 'sunset' ? 'text-orange-400' : 'text-accent'}`}
                aria-hidden="true"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rain effect for dirty energy */}
      <AnimatePresence>
        {
          sceneConfig.showRain && (
            <motion.div
              className="absolute inset-0 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              {rainConfig.map((drop) => (
                <RainDrop key={drop.id} delay={drop.delay} x={drop.x} />
              ))}
            </motion.div>
          )
        }
      </AnimatePresence >

      <Cloud
        className={`absolute top-20 w-24 h-14 text-card/80 ${shouldReduceMotion ? '' : 'animate-cloud-drift'}`}
        style={shouldReduceMotion ? { left: '10%' } : { animationDelay: '0s', animationDuration: '35s' }}
        aria-hidden="true"
      />
      <Cloud
        className={`absolute top-28 w-16 h-10 text-card/60 ${shouldReduceMotion ? '' : 'animate-cloud-drift'}`}
        style={shouldReduceMotion ? { left: '60%' } : { animationDelay: '-12s', animationDuration: '45s' }}
        aria-hidden="true"
      />
      <Cloud
        className={`absolute top-14 w-20 h-12 text-card/70 ${shouldReduceMotion ? '' : 'animate-cloud-drift'}`}
        style={shouldReduceMotion ? { left: '80%' } : { animationDelay: '-25s', animationDuration: '40s' }}
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
                className={`absolute top-8 w-28 h-16 text-secondary/50 ${shouldReduceMotion ? '' : 'animate-cloud-drift'}`}
                style={shouldReduceMotion ? { left: '20%' } : { animationDelay: '-5s', animationDuration: '25s' }}
                aria-hidden="true"
              />
              <Cloud
                className={`absolute top-14 w-24 h-14 text-secondary/40 ${shouldReduceMotion ? '' : 'animate-cloud-drift'}`}
                style={shouldReduceMotion ? { left: '50%' } : { animationDelay: '-18s', animationDuration: '28s' }}
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
            className="absolute inset-0 overflow-hidden pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {birdConfig.slice(0, sceneConfig.birdCount).map((bird) => (
              <FlyingBird
                key={bird.id}
                delay={bird.delay}
                duration={bird.duration}
                startX={-10}
                top={bird.top}
                scale={bird.scale}
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

      {/* Fireflies for clean nights */}
      <AnimatePresence>
        {sceneConfig.showFireflies && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {fireflyConfig.map((firefly) => (
              <Firefly
                key={firefly.id}
                delay={firefly.delay}
                x={firefly.x}
                y={firefly.y}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* High Fidelity Landscape (Hills + Trees) */}
      {/* Background Landscape Layer (Back + Mid Hills) */}
      <div className="absolute bottom-0 left-0 right-0 h-[85%] pointer-events-none z-0 overflow-hidden">
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
          <LandscapeBack
            cleanliness={sceneConfig.cleanliness}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={weather.isSnowing}
            isChristmas={new Date().getMonth() === 11}
            skipIntro={hasSeenScene}
            windSpeed={weather.windSpeed}
            timeOfDay={timeOfDay}
          />
          <LandscapeMid
            cleanliness={sceneConfig.cleanliness}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={weather.isSnowing}
            isChristmas={new Date().getMonth() === 11}
            skipIntro={hasSeenScene}
            windSpeed={weather.windSpeed}
            timeOfDay={timeOfDay}
          />
        </svg>
      </div>

      {/* Flock of Sheep (Sandwiched between Mid and Front layers) */}
      <AnimatePresence>
        {sceneConfig.cleanliness > 0.4 && !synthwaveMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="z-10 relative" // Ensure z-index is handled by container order usually, but explicit helpful
          >
            {/* Positioning them roughly where the gap between Mid and Front hills is */}
            <Sheep x={20} y={15} scale={0.7} isNight={isNight} delay={0.5} />
            <Sheep x={45} y={18} scale={0.65} isNight={isNight} delay={1.2} />
            <Sheep x={75} y={14} scale={0.7} isNight={isNight} delay={2.0} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Foreground Landscape Layer (Front Hill) - Occludes Sheep */}
      <div className="absolute bottom-0 left-0 right-0 h-[85%] pointer-events-none z-20 overflow-hidden">
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
          <LandscapeFront
            cleanliness={sceneConfig.cleanliness}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={weather.isSnowing}
            isChristmas={new Date().getMonth() === 11}
            skipIntro={hasSeenScene}
            windSpeed={weather.windSpeed}
            timeOfDay={timeOfDay}
          />
        </svg>
      </div>

      {/* Wind Turbines - dynamically positioned across the scene */}
      <AnimatePresence>
        {sceneConfig.showRenewables && turbineLayout.map((slot, i) => {
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
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Droplets className="w-6 h-6 text-gen-hydro/60" aria-hidden="true" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nuclear Cooling Towers - Show when nuclear % > 5 */}
      <AnimatePresence>
        {sceneConfig.showRenewables && nuclearPercentage > 5 && (
          <div className="absolute bottom-0 left-0 right-0 h-[85%] pointer-events-none z-15">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <NuclearCoolingTower x={280} steamIntensity={nuclearPercentage / 100} isNight={isNight} />
              {nuclearPercentage > 15 && <NuclearCoolingTower x={240} steamIntensity={0.5} isNight={isNight} />}
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Offshore Wind Turbines - Show when wind % > 10 */}
      <AnimatePresence>
        {windPercentage > 10 && (
          <div className="absolute bottom-0 left-0 right-0 h-[65%] pointer-events-none z-5">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <OffshoreWind count={Math.min(3, Math.floor(windPercentage / 10))} windSpeed={weather.windSpeed} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Tidal Waves - Show when hydro/marine % > 5 */}
      <AnimatePresence>
        {(hydroPercentage > 5 || marinePercentage > 0) && (
          <div className="absolute bottom-0 left-0 right-0 h-[65%] pointer-events-none z-25">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <TidalWaves intensity={(hydroPercentage + marinePercentage) / 100} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* ===== PHASE 2: CARBON MILESTONES ===== */}

      {/* Rainbow - appears during/after rain when sun is visible (daytime + rain) */}
      <AnimatePresence>
        {intensity < 50 && weather.isRaining && sceneConfig.isDaytime && <Rainbow />}
      </AnimatePresence>

      {/* Pollution Warning - High carbon (>300g) */}
      <AnimatePresence>
        {intensity > 300 && <PollutionWarning />}
      </AnimatePresence>

      {/* Net Zero Celebration - Zero or negative carbon */}
      <AnimatePresence>
        {intensity <= 0 && <NetZeroCelebration />}
      </AnimatePresence>

      {/* ===== PHASE 2: LIVING ECOSYSTEM ===== */}

      {/* Flowers for bees */}
      <AnimatePresence>
        {sceneConfig.cleanliness > 0.8 && sceneConfig.isDaytime && (
          <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none z-12">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <Flowers positions={[
                { x: 50, y: 120 },
                { x: 120, y: 115 },
                { x: 200, y: 118 },
                { x: 280, y: 120 },
                { x: 350, y: 117 },
              ]} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Bees visiting flowers */}
      <AnimatePresence>
        {sceneConfig.cleanliness > 0.8 && sceneConfig.isDaytime && (
          <>
            <Bee startX={15} startY={18} delay={0} />
            <Bee startX={50} startY={22} delay={2} />
            <Bee startX={75} startY={20} delay={4} />
          </>
        )}
      </AnimatePresence>

      {/* Rabbit hopping at dawn/dusk */}
      <AnimatePresence>
        {isDawnOrDusk && sceneConfig.cleanliness > 0.6 && <Rabbit delay={0} />}
      </AnimatePresence>

      {/* Owls perched on trees at night */}
      <AnimatePresence>
        {isNight && sceneConfig.cleanliness > 0.7 && (
          <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none z-12">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <Owl treeX={80} treeY={85} />
              <Owl treeX={320} treeY={95} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Fox - Rare event at dusk */}
      <AnimatePresence>
        {showFox && (
          <div onClick={() => unlock('fox_spotter')} className="cursor-pointer pointer-events-auto">
            <Fox />
          </div>
        )}
      </AnimatePresence>

      {/* ===== PHASE 3: ADVANCED FEATURES ===== */}

      {/* Background mountains for parallax */}
      <AnimatePresence>
        {sceneConfig.cleanliness > 0.5 && (
          <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none z-1">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <BackgroundMountains isNight={isNight} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Foreground grass with wind sway */}
      <AnimatePresence>
        {sceneConfig.cleanliness > 0.6 && (
          <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none z-30">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <ForegroundGrass windSpeed={weather.windSpeed} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Aurora Borealis for ultra-clean winter nights */}
      <AnimatePresence>
        {isNight && intensity < 30 && (new Date().getMonth() >= 11 || new Date().getMonth() <= 2) && (
          <AuroraBorealis intensity={(30 - intensity) / 30} />
        )}
      </AnimatePresence>

      {/* EV Charging Station at night when clean */}
      <AnimatePresence>
        {isNight && sceneConfig.cleanliness > 0.7 && (
          <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none z-16">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <EVChargingStation isCharging={sceneConfig.cleanliness > 0.8} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Hydro Dam when rainy + hydro */}
      <AnimatePresence>
        {isRaining && hydroPercentage > 10 && (
          <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none z-14">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <HydroDam flowIntensity={Math.min(hydroPercentage / 50, 1)} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Meteor Shower - Double-click moon */}
      <AnimatePresence>
        {showMeteorShower && <MeteorShower />}
      </AnimatePresence>

      {/* Biomass Smoke - Green tinted smoke when biomass > 5% */}
      <AnimatePresence>
        {biomassPercentage > 5 && sceneConfig.showRenewables && (
          <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none z-15">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <BiomassSmoke x={180} intensity={biomassPercentage / 100} />
              {biomassPercentage > 15 && <BiomassSmoke x={220} intensity={0.6} />}
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* ===== WINTER ELEMENTS ===== */}

      {/* Snow ground cover */}
      <AnimatePresence>
        {weather.isSnowing && <SnowGround intensity={weather.precipitationIntensity} />}
      </AnimatePresence>

      {/* Frozen pond */}
      <AnimatePresence>
        {weather.isSnowing && sceneConfig.cleanliness > 0.4 && <FrozenPond />}
      </AnimatePresence>

      {/* Breath mist from sheep in cold weather */}
      <AnimatePresence>
        {weather.isSnowing && sceneConfig.cleanliness > 0.4 && (
          <>
            <BreathMist x={22} y={18} />
            <BreathMist x={47} y={20} />
            <BreathMist x={76} y={17} />
          </>
        )}
      </AnimatePresence>

      {/* Snow accumulation on solar panels */}
      <AnimatePresence>
        {weather.isSnowing && sceneConfig.showRenewables && sceneConfig.showSun && <SnowOnPanels />}
      </AnimatePresence>
    </motion.div >
  );
}


