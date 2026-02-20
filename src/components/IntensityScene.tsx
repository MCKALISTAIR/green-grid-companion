
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
  }, [activeEvent, isNight, intensity]);

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
      turbineCount: Math.max(1, Math.floor(cleanliness * 4)),
      factoryOpacity: Math.max(0, 1 - cleanliness),
      solarBrightness: cleanliness * (weather.cloudCover < 50 ? 1 : 0.6) * (isDaytime ? 1 : isGoldenHour ? 0.6 : 0.2),
      birdCount: Math.floor(cleanliness * 4) + 1,
      starVisibility: cleanliness * (1 - weather.cloudCover / 100) * (timeOfDay === 'night' ? 1 : timeOfDay === 'dusk' ? 0.6 : 0.3),
      windSpeed: weather.windSpeed,
      sceneFilter: getTimeFilter(),
    };
  }, [intensity, index, timeOfDay, isNight, weather, synthwaveMode]);

  return (
    <motion.div
      className={`relative w-full h-[300px] md:h-[50vh] overflow-hidden rounded-xl md:rounded-l-xl transition-colors duration-1000 ${isVintage ? 'sepia-[.6] contrast-125 grayscale-[.3]' : ''} ${className || ''}`}
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
            className="absolute cursor-pointer active:scale-90"
            onClick={() => {
              impactMedium();
              setSynthwaveMode(!synthwaveMode);
            }}
            role="button"
            tabIndex={0}
            aria-label={`Toggle synthwave mode ${synthwaveMode ? 'off' : 'on'}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                impactMedium();
                setSynthwaveMode(!synthwaveMode);
              }
            }}
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
            <motion.div
              className="absolute inset-0 w-20 h-20 -translate-x-2 -translate-y-2 rounded-full blur-xl"
              style={{
                backgroundColor: timeOfDay === 'sunset' ? 'hsl(30 90% 55% / 0.4)' : 'hsl(var(--accent) / 0.3)',
              }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <Sun
              className={`w-16 h-16 relative z-10 ${timeOfDay === 'sunset' ? 'text-orange-400' : 'text-accent'}`}
              aria-hidden="true"
            />
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
              {[...Array(20)].map((_, i) => (
                <RainDrop key={i} delay={Math.random() * 2} x={5 + (i * 4.5)} />
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
            {[...Array(8)].map((_, i) => (
              <Firefly
                key={i}
                delay={i * 0.5}
                x={10 + Math.random() * 80}
                y={10 + Math.random() * 40}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* High Fidelity Landscape (Hills + Trees) */}
      {/* Background Landscape Layer (Back + Mid Hills) */}
      <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none z-0">
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
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
      <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none z-20">
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
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

      {/* Wind Turbines for clean energy */}
      <AnimatePresence>
        {sceneConfig.showRenewables && (
          <motion.div
            className="absolute bottom-[18%] left-0 right-0 flex justify-around px-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, staggerChildren: 0.1 }}
          >
            {Array.from({ length: sceneConfig.turbineCount }).map((_, i) => {
              // Wind speed affects turbine rotation (faster wind = faster spin)
              // Base speed 5s for 0 wind, down to 1.5s for 30+ km/h wind
              const baseSpeed = Math.max(1.5, 5 - (sceneConfig.windSpeed / 10));
              const isOverdrive = turbineOverdrive === i;

              // Hint logic for first turbine
              const showHint = i === 1 && !localStorage.getItem('hasInteractedWithTurbine');

              return (
                <div key={i} className="relative">
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/90 text-primary px-2 py-1 rounded text-[10px] font-bold shadow-lg whitespace-nowrap z-50 pointer-events-none"
                    >
                      Tap me! 👇
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/90 rotate-45"></div>
                    </motion.div>
                  )}
                  <WindTurbine
                    scale={0.7 + (i % 2) * 0.2}
                    speed={isOverdrive ? 0.2 : (baseSpeed + i * 0.3)} // Super fast if overdrive
                    onClick={() => {
                      handleTurbineClick(i);
                      if (!localStorage.getItem('hasInteractedWithTurbine')) {
                        localStorage.setItem('hasInteractedWithTurbine', 'true');
                        // Force re-render to hide hint (React will handle this if we used state, but component might not update immediately without state change. 
                        // However, handleTurbineClick causes state change (overdrive), so re-render happens.)
                      }
                    }}
                  />
                </div>
              );
            })}
          </motion.div>
        )}
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
          <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none z-15">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
              <NuclearCoolingTower x={280} steamIntensity={nuclearPercentage / 100} isNight={isNight} />
              {nuclearPercentage > 15 && <NuclearCoolingTower x={240} steamIntensity={0.5} isNight={isNight} />}
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Offshore Wind Turbines - Show when wind % > 10 */}
      <AnimatePresence>
        {windPercentage > 10 && (
          <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none z-5">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
              <OffshoreWind count={Math.min(3, Math.floor(windPercentage / 10))} windSpeed={weather.windSpeed} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Tidal Waves - Show when hydro/marine % > 5 */}
      <AnimatePresence>
        {(hydroPercentage > 5 || marinePercentage > 0) && (
          <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none z-25">
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
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
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


