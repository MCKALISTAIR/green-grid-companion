import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { WeatherData } from '@/hooks/useWeatherData';
import { getSkyGradient } from '@/lib/sceneUtils';

export interface SceneVisualConfig {
  cleanliness: number;
  skyGradient: string;
  groundColor: string;
  showRenewables: boolean;
  showFactories: boolean;
  showBirds: boolean;
  showSmoke: boolean;
  showRain: boolean;
  showSunRays: boolean;
  showStars: boolean;
  showMoon: boolean;
  showSun: boolean;
  showButterflies: boolean;
  showFireflies: boolean;
  isGoldenHour: boolean;
  isDaytime: boolean;
  isDarkPeriod: boolean;
  turbineCount: number;
  factoryOpacity: number;
  solarBrightness: number;
  birdCount: number;
  starVisibility: number;
  windSpeed: number;
  sceneFilter: string;
}

interface BuildSceneConfigInput {
  intensity: number;
  index: string;
  timeOfDay: TimeOfDay;
  weather: WeatherData;
  synthwaveMode: boolean;
  isNight: boolean;
}

export function buildSceneConfig({
  intensity,
  index,
  timeOfDay,
  weather,
  synthwaveMode,
  isNight,
}: BuildSceneConfigInput): SceneVisualConfig {
  const cleanliness = Math.max(0, Math.min(1, 1 - (intensity - 50) / 300));
  const weatherReducesBirds = weather.isRaining || weather.isSnowing || weather.isThunderstorm;
  const weatherReducesButterflies =
    weather.isRaining || weather.isSnowing || weather.isFoggy || weather.isThunderstorm;

  const isDaytime = timeOfDay === 'morning' || timeOfDay === 'midday' || timeOfDay === 'afternoon';
  const isGoldenHour = timeOfDay === 'sunset' || timeOfDay === 'dawn';
  const isDarkPeriod = timeOfDay === 'night' || timeOfDay === 'dusk';
  const showSun = isDaytime || timeOfDay === 'sunset';

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

  const getGroundColor = (): string => {
    if (synthwaveMode) return '#3c096c';
    if (weather.isSnowing) return isNight ? '#334155' : '#f1f5f9';
    if (isNight) return '#1e293b';
    const isClean = cleanliness > 0.5;
    if (timeOfDay === 'dawn') return isClean ? '#204d30' : '#4d3215';
    if (timeOfDay === 'sunset') return isClean ? '#365a18' : '#5c3209';
    if (timeOfDay === 'dusk') return isClean ? '#21334c' : '#3a2818';
    return isClean ? '#16a34a' : '#713f12';
  };

  return {
    cleanliness,
    skyGradient: synthwaveMode
      ? 'linear-gradient(180deg, #2b1055 0%, #7597de 100%)'
      : getSkyGradient(index, timeOfDay, cleanliness, weather),
    groundColor: getGroundColor(),
    showRenewables: cleanliness > 0.25,
    showFactories: cleanliness < 0.85,
    showBirds: cleanliness > 0.6 && isDaytime && !weatherReducesBirds,
    showSmoke: cleanliness < 0.5,
    showRain: cleanliness < 0.35 && !weather.isRaining,
    showSunRays:
      cleanliness > 0.7 &&
      (timeOfDay === 'morning' || timeOfDay === 'midday' || timeOfDay === 'afternoon') &&
      weather.cloudCover < 60 &&
      !weather.isRaining,
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
    solarBrightness:
      cleanliness * (weather.cloudCover < 50 ? 1 : 0.6) * (isDaytime ? 1 : isGoldenHour ? 0.6 : 0.2),
    birdCount: Math.floor(cleanliness * 4) + 1,
    starVisibility:
      cleanliness *
      (1 - weather.cloudCover / 100) *
      (timeOfDay === 'night' ? 1 : timeOfDay === 'dusk' ? 0.6 : 0.3),
    windSpeed: weather.windSpeed,
    sceneFilter: getTimeFilter(),
  };
}
