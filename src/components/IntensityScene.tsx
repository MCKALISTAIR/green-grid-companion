import { useHaptics } from '@/hooks/useHaptics';
import { NotificationType } from '@capacitor/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useScroll, useTransform } from 'framer-motion';
import { useTimeOfDay, TimeOfDay } from '@/hooks/useTimeOfDay';
import { isNightTimeOfDay } from '@/lib/timeOfDayNight';
import { useWeatherData, WeatherData } from '@/hooks/useWeatherData';
import { useAchievements } from '@/hooks/useAchievements';
import { useSceneDirector } from '@/hooks/useSceneDirector';
import { useCleanlinessBand } from '@/hooks/useCleanlinessBand';
import type { SceneGrowthStage } from '@/hooks/useSceneGrowth';
import { SceneHaze } from './scene/art/SceneHaze';
import { nesoBand } from '@/lib/nesoBand';
import { getHazeBand, getSkyBlend, HAZE_SKY_BLEND_COLOR } from '@/lib/sceneHaze';
import { StateTransitionFX } from './scene/StateTransitionFX';
import { SceneTemporalLife } from './scene/SceneTemporalLife';
import { GenerationMix } from '@/lib/carbonApi';
import { buildSceneConfig } from '@/lib/sceneConfig';
import type { BirdFlightBand } from '@/lib/birdFlightBand';
import { useTapCount } from '@/lib/useTapCount';
import { cityWeatherState } from '@/lib/cityLandmarkPalette';
import { buildTurbineLayout } from '@/lib/turbineLayout';
import { useSceneType, SceneType } from '@/hooks/useSceneType';
import {
  SceneSkyLayer,
  SceneCloudBankLayer,
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
  /** BH-143: garden stage from useSceneGrowth on the page; sparse when omitted. */
  growthStage?: SceneGrowthStage;
  isVintage?: boolean;
  className?: string;
  sceneTypeOverride?: SceneType;
  timeOfDayOverride?: TimeOfDay;
  weatherOverride?: Partial<WeatherData>;
  style?: React.CSSProperties;
  /**
   * False while data is loading or failed, when `intensity` is a placeholder.
   * Gates milestone effects such as the zero-carbon celebration.
   */
  hasLiveReading?: boolean;
  /**
   * Demand (and other gauge-less) modes: pull silhouettes up in a shorter band
   * so skyline reads above the scalloped sheet instead of empty sky.
   */
  compact?: boolean;
  /**
   * BH-90: px from the scene top where unknown-weather clouds may start: the hero
   * text bottom + 34 (village REDRAW-PLAN), so no cloud edge crosses the text.
   */
  cloudTopPx?: number;
  /**
   * BH-116: the lane (px from the scene top) ambient birds fly in, below the
   * hero text + 12 px. null: no birds (no room, or not measured yet). Omitted
   * (no hero text over the scene): birds fly at their usual 10-40% heights.
   */
  birdBand?: BirdFlightBand | null;
  /** Design review of #184: tells the hero when synthwave is on, so its text goes white. */
  onSynthwaveChange?: (on: boolean) => void;
}

export function IntensityScene({
  intensity: propIntensity,
  index: propIndex,
  generationMix = [],
  growthStage = 0,
  isVintage = false,
  className,
  sceneTypeOverride,
  timeOfDayOverride,
  weatherOverride,
  style,
  hasLiveReading = true,
  compact = false,
  cloudTopPx,
  birdBand,
  onSynthwaveChange,
}: IntensitySceneProps) {
  const {
    timeOfDay: realTimeOfDay,
    isNight: realIsNight,
    sunPosition: realSunPosition,
  } = useTimeOfDay();
  const { weather: realWeather, weatherKnown: realWeatherKnown } = useWeatherData();
  const { unlock } = useAchievements();
  const { active: isDirectorMode, overrides } = useSceneDirector();
  const { impactLight, impactMedium, notification } = useHaptics({ decorative: true }); // scene taps: decorative
  const shouldReduceMotion = useReducedMotion();
  const { sceneType: autoSceneType, cityVariant } = useSceneType();

  // Page-scroll parallax is for the home hero only. Vintage/Time Machine embeds
  // the scene in a short card — tracking document scrollY makes clouds/sky slide
  // down over the skyline as the History page scrolls.
  const enableScrollParallax = !isVintage;
  const { scrollY } = useScroll();
  const skyYParallax = useTransform(scrollY, [0, 400], [0, 75]);
  const backYParallax = useTransform(scrollY, [0, 400], [0, 45]);
  const midYParallax = useTransform(scrollY, [0, 400], [0, 20]);
  const staticY = useMotionValue(0);
  const skyY = enableScrollParallax ? skyYParallax : staticY;
  const backY = enableScrollParallax ? backYParallax : staticY;
  const midY = enableScrollParallax ? midYParallax : staticY;

  // Scene type: override, director override or auto-detected
  const sceneType: SceneType =
    sceneTypeOverride ??
    (isDirectorMode && overrides.sceneType ? overrides.sceneType : autoSceneType);
  const isCity = sceneType === 'city';
  const isCoastal = sceneType === 'coastal';

  // Helper to determine active time of day (override, director override or real)
  const timeOfDay =
    timeOfDayOverride ??
    (isDirectorMode && overrides.timeOfDay ? overrides.timeOfDay : realTimeOfDay);

  // Dawn parity (BH-94 QA tooling): an override counts as night exactly when the
  // real clock would (night and dusk), so dawn previews match production.
  const timeOverride =
    timeOfDayOverride ?? (isDirectorMode && overrides.timeOfDay ? overrides.timeOfDay : undefined);
  const isNight = timeOverride ? isNightTimeOfDay(timeOverride) : realIsNight;

  // Override Weather - wrapped in useMemo to prevent dependency issues
  const weather = useMemo(() => {
    if (weatherOverride) {
      return { ...realWeather, ...weatherOverride };
    }
    return isDirectorMode && overrides.weather
      ? { ...realWeather, ...overrides.weather }
      : realWeather;
  }, [weatherOverride, isDirectorMode, overrides.weather, realWeather]);
  // A SceneTest / Director weather override counts as known weather (dev tools).
  const weatherKnown =
    realWeatherKnown || Boolean(weatherOverride) || (isDirectorMode && Boolean(overrides.weather));

  // BH-96: synthwave is in memory only (never persisted), so it resets on reload
  // and next launch.
  const [synthwaveMode, setSynthwaveMode] = useState(false);
  useEffect(() => {
    onSynthwaveChange?.(synthwaveMode);
  }, [synthwaveMode, onSynthwaveChange]);
  // Bumped on every sun tap; SceneSkyLayer replays the small sun reaction.
  const [sunReactionKey, setSunReactionKey] = useState(0);
  const registerSunTap = useTapCount();
  const lastSunHapticRef = useRef(0);

  // Apply Intensity Override (guarantee a valid number, default to 150 moderate if propIntensity is undefined/null/NaN)
  const rawIntensity =
    isDirectorMode && overrides.intensity !== undefined ? overrides.intensity : propIntensity;
  const intensity = typeof rawIntensity === 'number' && !isNaN(rawIntensity) ? rawIntensity : 150;

  const rawIndex =
    isDirectorMode && overrides.intensity !== undefined ? nesoBand(overrides.intensity) : propIndex;
  const index = rawIndex || 'moderate';
  // PR-2b: haze and smoke follow the NESO band only, and need a real reading
  // (or a Director override). No data means no haze and no smoke.
  const hasBandReading = hasLiveReading || (isDirectorMode && overrides.intensity !== undefined);
  const hazeBand = hasBandReading ? getHazeBand(rawIndex, intensity) : 'none';

  // Cleanliness band + transition flourish trigger
  const { band: cleanlinessBand, transition: bandTransition } = useCleanlinessBand(
    intensity,
    undefined,
    rawIndex,
  );
  // BH-143: the page owns garden growth (low-carbon days in the last 14).
  const sceneGrowth = { stage: growthStage };

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
      scale: 0.6 + Math.random() * 0.4,
    }));
  }, []);

  const fireflyConfig = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      delay: i * 0.5,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 40,
    }));
  }, []);

  const { isRaining } = weather;

  const [activeEvent, setActiveEvent] = useState<SceneRandomEvent>('none');
  const [turbineOverdrive, setTurbineOverdrive] = useState<number | null>(null);

  const handleTurbineClick = (i: number) => {
    setTurbineOverdrive(i);
    setTimeout(() => setTurbineOverdrive(null), 2000);
  };

  const getGenerationPercentage = (fuel: string) => {
    const mix = generationMix.find((m) => m.fuel.toLowerCase() === fuel.toLowerCase());
    return mix?.perc || 0;
  };

  const nuclearPercentage = getGenerationPercentage('nuclear');
  const windPercentage = getGenerationPercentage('wind');
  const hydroPercentage = getGenerationPercentage('hydro');
  const marinePercentage =
    generationMix.find(
      (m) => m.fuel.toLowerCase().includes('marine') || m.fuel.toLowerCase().includes('tidal'),
    )?.perc || 0;

  // Diegetic ambient events only (art direction) — grid-mood, not sci-fi roulette.
  // UFO is an ultra-rare night easter egg at garden stage 4+.
  useEffect(() => {
    const triggerDiegeticEvent = () => {
      if (activeEvent !== 'none') return;
      const rand = Math.random();
      if (intensity > 220 && rand > 0.82) {
        setActiveEvent('train'); // dirty grid → freight / peaker vibe
      } else if (
        timeOfDay !== 'night' &&
        timeOfDay !== 'dusk' &&
        intensity < 120 &&
        windPercentage > 15 &&
        rand > 0.78
      ) {
        setActiveEvent('drone'); // clean renewables → survey drone
      } else if (isNight && sceneGrowth.stage >= 4 && rand > 0.97) {
        setActiveEvent('ufo'); // easter egg only — not brand
      }
    };
    const interval = setInterval(triggerDiegeticEvent, 45_000);
    return () => clearInterval(interval);
  }, [activeEvent, isNight, intensity, timeOfDay, windPercentage, sceneGrowth.stage]);

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

  // BH-96 (Design brief Q1): every tap on the sun gives a small reaction (disc
  // pulse + light haptic, haptic at most once per 1.2 s). Three taps within 1.5 s
  // toggle synthwave (medium haptic); a single or double tap never does.
  // Design review of #184: the third tap toggles synthwave only, without
  // replaying the small sun reaction.
  const handleSunTap = () => {
    if (registerSunTap()) {
      impactMedium();
      setSynthwaveMode((on) => !on);
      return;
    }
    setSunReactionKey((k) => k + 1);
    const now = Date.now();
    if (now - lastSunHapticRef.current >= 1200) {
      lastSunHapticRef.current = now;
      impactLight();
    }
  };

  const biomassPercentage = getGenerationPercentage('biomass');
  const solarShare = generationMix?.length ? getGenerationPercentage('solar') : undefined;

  const sceneConfig = useMemo(
    () =>
      buildSceneConfig({
        intensity,
        index,
        timeOfDay,
        weather,
        synthwaveMode,
        isNight,
        sceneType,
        weatherKnown,
        hazeBand,
        solarShare,
      }),
    [
      intensity,
      index,
      timeOfDay,
      weather,
      synthwaveMode,
      isNight,
      sceneType,
      weatherKnown,
      hazeBand,
      solarShare,
    ],
  );
  const skyBlend = synthwaveMode || isNight ? 0 : getSkyBlend(hazeBand, timeOfDay);

  return (
    <motion.div
      // Aspect-ratio aware height: cap scene height on tall narrow phones so the sky
      // doesn't dominate, and lower the floor on short/wide viewports (iPhone Duo cover
      // ~466×678 and inner landscape ~890×626) so chrome + cards still fit. See
      // src/lib/sceneHeight.ts for the shared JS mirror used by visual QA.
      className={`relative w-full overflow-hidden pb-4 lg:pb-8 transition-colors duration-1000 ${isVintage ? 'sepia-[.6] contrast-125 grayscale-[.3]' : ''} ${className || ''}`}
      style={{
        height: 'clamp(min(280px, 45dvh), min(55dvh, 75vw), min(620px, 70dvh))',
        ...style,
      }}
      // PR-2b round 4: with a sky blend (day, high and very high) the sky and its
      // grey blend sit here, outside the scene filter, so the set colour lands.
      // Otherwise the sky is drawn on the filtered layer below, as before.
      animate={{ background: skyBlend > 0 ? sceneConfig.skyGradient : 'transparent' }}
      transition={{ duration: 2, ease: 'easeInOut' as const }}
      // region (not img): scene contains focusable tap targets (moon, cooling tower,
      // fact bubble...); role="img" forbids that
      role="region"
      data-synthwave={synthwaveMode ? 'on' : 'off'}
      aria-label={`Animated landscape representing ${index} carbon intensity`}
      data-scene-type={sceneType}
      data-time-of-day={timeOfDay}
      data-scene-night={isNight ? 'on' : 'off'}
    >
      {/* PR-2b round 3: by day at high and very high the whole sky blends toward
          grey, under all scene art and outside the scene filter, so the land
          never changes and the set colour lands. */}
      {skyBlend > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          data-art="sky-blend"
          data-sky-blend={skyBlend}
          style={{ backgroundColor: HAZE_SKY_BLEND_COLOR, opacity: skyBlend }}
        />
      )}

      <motion.div
        className="absolute inset-0"
        data-art="scene-filtered"
        animate={{
          background: skyBlend > 0 ? 'transparent' : sceneConfig.skyGradient,
          filter: sceneConfig.sceneFilter,
        }}
        transition={{ duration: 2, ease: 'easeInOut' as const }}
      >
        {isVintage && (
          <div
            className="absolute inset-0 z-50 pointer-events-none opacity-20 mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
            }}
          />
        )}

        {/* Wrapper to shift scenery up and protect it from being cut off by the bottom wave/cards.
          Compact (Demand): lift + scale so bottom-aligned silhouettes clear the sheet overlap. */}
        <div
          className={
            compact
              ? 'absolute inset-0 bottom-0 origin-bottom scale-[1.45] -translate-y-[22%] pointer-events-none'
              : 'absolute inset-0 bottom-[40px] pointer-events-none'
          }
        >
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
            sunReactionKey={sunReactionKey}
            handleMoonDoubleClick={handleMoonDoubleClick}
            onSunTap={handleSunTap}
            cloudTopPx={cloudTopPx}
            bankBehindSkyline={isCity}
          />

          {/* PR-2b: one horizon-weighted haze by NESO band replaces IntensityMood, the
            depth band and the hero spotlight glow (retired: it read as a pale
            smudge behind the hero text on grey days). */}
          <SceneHaze
            band={sceneConfig.hazeBand}
            sceneType={sceneType}
            timeOfDay={timeOfDay}
            isFoggy={sceneConfig.weatherKnown && weather.isFoggy}
            synthwaveMode={synthwaveMode}
          />
          <StateTransitionFX transition={bandTransition} />

          <SceneAmbientLife
            sceneConfig={sceneConfig}
            shouldReduceMotion={shouldReduceMotion}
            birdConfig={birdConfig}
            birdBand={birdBand}
            fireflyConfig={fireflyConfig}
          />

          {/* BH-117: city skylines (castle, London landmarks, neutral skyline) stand in
            front of the cloud bank, so in city scenes it is drawn here, just
            before CitySceneLayers, instead of inside the sky layer. */}
          {isCity && (
            <SceneCloudBankLayer
              skyY={skyY}
              shouldReduceMotion={shouldReduceMotion}
              weather={weather}
              isNight={isNight}
              timeOfDay={timeOfDay}
              weatherKnown={sceneConfig.weatherKnown}
              cloudTopPx={cloudTopPx}
            />
          )}

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
              cityVariant={cityVariant}
              nesoIndex={
                hasLiveReading || (isDirectorMode && overrides.intensity !== undefined)
                  ? rawIndex || undefined
                  : undefined
              }
              weatherState={cityWeatherState(weatherKnown, weather)}
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
              hazeBand={sceneConfig.hazeBand}
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
            hasLiveReading={hasLiveReading || (isDirectorMode && overrides.intensity !== undefined)}
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

          <SceneWinterLayer weather={weather} sceneConfig={sceneConfig} />

          <SceneRandomEvents activeEvent={activeEvent} onComplete={() => setActiveEvent('none')} />
        </div>

        {/* Fill the bottom-[40px] safety gap with ground colour so sky/grade
          doesn't show as a discordant purple/teal bar under the landscape. */}
        <div
          className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none z-[45]"
          style={{ backgroundColor: sceneConfig.groundColor }}
          data-land="ground"
          aria-hidden="true"
        />
      </motion.div>
    </motion.div>
  );
}
