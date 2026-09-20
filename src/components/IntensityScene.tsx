import { useHaptics } from '@/hooks/useHaptics';
import { NotificationType } from '@capacitor/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useMemo, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTimeOfDay, TimeOfDay } from '@/hooks/useTimeOfDay';
import { useWeatherData, WeatherData } from '@/hooks/useWeatherData';
import { useAchievements } from '@/hooks/useAchievements';
import { useSceneDirector } from '@/hooks/useSceneDirector';
import { useCleanlinessBand } from '@/hooks/useCleanlinessBand';
import { useSceneGrowth } from '@/hooks/useSceneGrowth';
import { SceneColorGrade } from './scene/SceneColorGrade';
import { StateTransitionFX } from './scene/StateTransitionFX';
import { SceneHeroSpotlight, SceneAtmosphericDepth } from './scene/SceneComposition';
import { SceneTemporalLife } from './scene/SceneTemporalLife';
import { GenerationMix } from '@/lib/carbonApi';
import { buildSceneConfig } from '@/lib/sceneConfig';
import { buildTurbineLayout } from '@/lib/turbineLayout';
import { useSceneType, SceneType } from '@/hooks/useSceneType';
import {
  SceneSkyLayer,
  SceneAmbientLife,
  CoastalSceneLayers,
  CitySceneLayers,
  CountrysideSceneLayers,
  SceneGenerationOverlay,
  SceneMilestoneFX,
  SceneEcosystemLayer,
  SceneAdvancedLayer,
  SceneWinterLayer,
  SceneRandomEvents,
  type SceneRandomEvent,
} from './scene/layers';

interface IntensitySceneProps {
  intensity: number;
  index: string;
  generationMix?: GenerationMix[];
  isVintage?: boolean;
  className?: string;
  sceneTypeOverride?: SceneType;
  timeOfDayOverride?: TimeOfDay;
  weatherOverride?: Partial<WeatherData>;
  style?: React.CSSProperties;
}

export function IntensityScene({
  intensity: propIntensity,
  index: propIndex,
  generationMix = [],
  isVintage = false,
  className,
  sceneTypeOverride,
  timeOfDayOverride,
  weatherOverride,
  style,
}: IntensitySceneProps) {
  const { timeOfDay: realTimeOfDay, isNight: realIsNight, sunPosition: realSunPosition } = useTimeOfDay();
  const { weather: realWeather } = useWeatherData();
  const { unlock } = useAchievements();
  const { active: isDirectorMode, overrides } = useSceneDirector();
  const { impactMedium, notification } = useHaptics();
  const shouldReduceMotion = useReducedMotion();
  const { sceneType: autoSceneType } = useSceneType();

  const { scrollY } = useScroll();
  const skyY = useTransform(scrollY, [0, 400], [0, 75]);
  const backY = useTransform(scrollY, [0, 400], [0, 45]);
  const midY = useTransform(scrollY, [0, 400], [0, 20]);
  
  // Scene type: override, director override or auto-detected
  const sceneType: SceneType = sceneTypeOverride
    ?? ((isDirectorMode && overrides.sceneType) ? overrides.sceneType : autoSceneType);
  const isCity = sceneType === 'city';
  const isCoastal = sceneType === 'coastal';

  // Helper to determine active time of day (override, director override or real)
  const timeOfDay = timeOfDayOverride
    ?? ((isDirectorMode && overrides.timeOfDay) ? overrides.timeOfDay : realTimeOfDay);

  const isNight = timeOfDayOverride
    ? (timeOfDayOverride === 'night' || timeOfDayOverride === 'dusk' || timeOfDayOverride === 'dawn')
    : ((isDirectorMode && overrides.timeOfDay)
      ? (overrides.timeOfDay === 'night' || overrides.timeOfDay === 'dusk' || overrides.timeOfDay === 'dawn')
      : realIsNight);

  // Override Weather - wrapped in useMemo to prevent dependency issues
  const weather = useMemo(() => {
    if (weatherOverride) {
      return { ...realWeather, ...weatherOverride };
    }
    return (isDirectorMode && overrides.weather) ? { ...realWeather, ...overrides.weather } : realWeather;
  }, [weatherOverride, isDirectorMode, overrides.weather, realWeather]);

  const [synthwaveMode, setSynthwaveMode] = useState(false);
  const [sunGlassesActive, setSunGlassesActive] = useState(false);

  // Apply Intensity Override (guarantee a valid number, default to 150 moderate if propIntensity is undefined/null/NaN)
  const rawIntensity = (isDirectorMode && overrides.intensity !== undefined) ? overrides.intensity : propIntensity;
  const intensity = typeof rawIntensity === 'number' && !isNaN(rawIntensity) ? rawIntensity : 150;

  const rawIndex = (isDirectorMode && overrides.intensity !== undefined)
    ? (overrides.intensity < 50 ? 'very low' : overrides.intensity < 150 ? 'low' : overrides.intensity < 250 ? 'moderate' : overrides.intensity < 350 ? 'high' : 'very high')
    : propIndex;
  const index = rawIndex || 'moderate';

  // Cleanliness band + transition flourish trigger
  const { band: cleanlinessBand, transition: bandTransition } = useCleanlinessBand(intensity);
  const sceneGrowth = useSceneGrowth(intensity, generationMix);

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

  const [activeEvent, setActiveEvent] = useState<SceneRandomEvent>('none');
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
  const turbineLayout = useMemo(() => buildTurbineLayout(windPercentage), [windPercentage]);

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

  const handleSunDoubleClick = () => {
    if (shouldReduceMotion) return;
    notification(NotificationType.Success);
    setSunGlassesActive(true);
    setTimeout(() => setSunGlassesActive(false), 4000);
  };

  const biomassPercentage = getGenerationPercentage('biomass');

  const sceneConfig = useMemo(
    () =>
      buildSceneConfig({
        intensity,
        index,
        timeOfDay,
        weather,
        synthwaveMode,
        isNight,
      }),
    [intensity, index, timeOfDay, weather, synthwaveMode, isNight],
  );

  return (
    <motion.div
      // Aspect-ratio aware height: cap scene height on tall narrow phones so the sky
      // doesn't dominate, and lower the floor on short/wide viewports (iPhone Duo cover
      // ~466×678 and inner landscape ~890×626) so chrome + cards still fit. See
      // src/lib/sceneHeight.ts for the shared JS mirror used by visual QA.
      className={`relative w-full overflow-hidden pb-4 lg:pb-8 transition-colors duration-1000 ${isVintage ? 'sepia-[.6] contrast-125 grayscale-[.3]' : ''} ${className || ''}`}
      style={{
        height: 'clamp(min(280px, 45dvh), min(55dvh, 75vw), min(620px, 70dvh))',
        ...style
      }}
      animate={{
        background: sceneConfig.skyGradient,
        filter: sceneConfig.sceneFilter,
      }}
      transition={{ duration: 2, ease: 'easeInOut' as const }}
      role="img"
      aria-label={`Animated landscape representing ${index} carbon intensity`}
    >
      {isVintage && (
        <div className="absolute inset-0 z-50 pointer-events-none opacity-20 mix-blend-overlay"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
        />
      )}


      {/* Wrapper to shift scenery up and protect it from being cut off by the bottom wave/cards */}
      <div className="absolute inset-0 bottom-[40px] pointer-events-none">
        {/* Sky/Celestial Parallax Group */}
        <SceneSkyLayer
          skyY={skyY}
          shouldReduceMotion={shouldReduceMotion}
          weather={weather}
          isNight={isNight}
          propIntensity={propIntensity}
          sceneConfig={sceneConfig}
          sunPosition={sunPosition}
          timeOfDay={timeOfDay}
          synthwaveMode={synthwaveMode}
          setSynthwaveMode={setSynthwaveMode}
          sunGlassesActive={sunGlassesActive}
          handleMoonDoubleClick={handleMoonDoubleClick}
          handleSunDoubleClick={handleSunDoubleClick}
          impactMedium={impactMedium}
        />

        <SceneAtmosphericDepth cleanliness={sceneConfig.cleanliness} isNight={isNight} />
        <SceneHeroSpotlight band={cleanlinessBand} isCity={isCity} isCoastal={isCoastal} isNight={isNight} />
        <SceneColorGrade cleanliness={sceneConfig.cleanliness} isNight={isNight} />
        <StateTransitionFX transition={bandTransition} />

        <SceneAmbientLife
          sceneConfig={sceneConfig}
          shouldReduceMotion={shouldReduceMotion}
          rainConfig={rainConfig}
          birdConfig={birdConfig}
          fireflyConfig={fireflyConfig}
        />

        {/* ===== LANDSCAPE LAYERS ===== */}
        {isCoastal ? (
          <CoastalSceneLayers
            shouldReduceMotion={shouldReduceMotion}
            backY={backY}
            midY={midY}
            sceneConfig={sceneConfig}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={weather.isSnowing}
            skipIntro={hasSeenScene}
            windSpeed={weather.windSpeed}
            timeOfDay={timeOfDay}
            windPercentage={windPercentage}
            hydroPercentage={hydroPercentage}
            marinePercentage={marinePercentage}
          />
        ) : isCity ? (
          <CitySceneLayers
            shouldReduceMotion={shouldReduceMotion}
            backY={backY}
            midY={midY}
            sceneConfig={sceneConfig}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={weather.isSnowing}
            skipIntro={hasSeenScene}
            windSpeed={weather.windSpeed}
            timeOfDay={timeOfDay}
            cleanlinessBand={cleanlinessBand}
            intensity={intensity}
          />
        ) : (
          <CountrysideSceneLayers
            shouldReduceMotion={shouldReduceMotion}
            backY={backY}
            midY={midY}
            sceneConfig={sceneConfig}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={weather.isSnowing}
            skipIntro={hasSeenScene}
            windSpeed={weather.windSpeed}
            timeOfDay={timeOfDay}
            windPercentage={windPercentage}
            nuclearPercentage={nuclearPercentage}
            hydroPercentage={hydroPercentage}
            isRaining={isRaining}
          />
        )}

        <SceneGenerationOverlay
          sceneConfig={sceneConfig}
          isCity={isCity}
          isCoastal={isCoastal}
          isNight={isNight}
          turbineLayout={turbineLayout}
          turbineOverdrive={turbineOverdrive}
          handleTurbineClick={handleTurbineClick}
          nuclearPercentage={nuclearPercentage}
          windPercentage={windPercentage}
          hydroPercentage={hydroPercentage}
          marinePercentage={marinePercentage}
          windSpeed={weather.windSpeed}
        />

        <SceneMilestoneFX
          intensity={intensity}
          weather={weather}
          sceneConfig={sceneConfig}
        />

        <SceneEcosystemLayer
          sceneConfig={sceneConfig}
          isCity={isCity}
          isCoastal={isCoastal}
          isNight={isNight}
          isDawnOrDusk={isDawnOrDusk}
          shouldReduceMotion={shouldReduceMotion}
          backY={backY}
          midY={midY}
          showFox={showFox}
          onFoxClick={() => unlock('fox_spotter')}
          growthStage={sceneGrowth.stage}
        />

        <SceneTemporalLife
          stage={sceneGrowth.stage}
          isCity={isCity}
          isCoastal={isCoastal}
          isDaytime={sceneConfig.isDaytime}
          isNight={isNight}
        />

        <SceneAdvancedLayer
          sceneConfig={sceneConfig}
          isCity={isCity}
          isCoastal={isCoastal}
          isNight={isNight}
          isRaining={isRaining}
          windSpeed={weather.windSpeed}
          hydroPercentage={hydroPercentage}
          biomassPercentage={biomassPercentage}
          showMeteorShower={showMeteorShower}
        />

        <SceneWinterLayer
          weather={weather}
          sceneConfig={sceneConfig}
        />

        <SceneRandomEvents
          activeEvent={activeEvent}
          onComplete={() => setActiveEvent('none')}
        />

      </div>

      {/* Fill the bottom-[40px] safety gap with ground colour so sky/grade
          doesn't show as a discordant purple/teal bar under the landscape. */}
      <div
        className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none z-[45]"
        style={{ backgroundColor: sceneConfig.groundColor }}
        aria-hidden="true"
      />

    </motion.div >
  );
}
