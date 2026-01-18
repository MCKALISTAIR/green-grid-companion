import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

// Weather condition types based on WMO codes
export type WeatherCondition = 
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'snow'
  | 'heavy-snow'
  | 'thunderstorm';

export interface WeatherData {
  condition: WeatherCondition;
  temperature: number;
  humidity: number;
  windSpeed: number;
  cloudCover: number;
  isRaining: boolean;
  isSnowing: boolean;
  isFoggy: boolean;
  isThunderstorm: boolean;
  precipitationIntensity: number; // 0-1
}

// Map WMO weather codes to our conditions
function mapWMOCodeToCondition(code: number): WeatherCondition {
  // WMO Weather interpretation codes (WW)
  // https://open-meteo.com/en/docs
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly-cloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 55) return 'drizzle';
  if (code >= 56 && code <= 57) return 'drizzle'; // freezing drizzle
  if (code >= 61 && code <= 65) return code === 65 ? 'heavy-rain' : 'rain';
  if (code >= 66 && code <= 67) return 'rain'; // freezing rain
  if (code >= 71 && code <= 75) return code === 75 ? 'heavy-snow' : 'snow';
  if (code === 77) return 'snow'; // snow grains
  if (code >= 80 && code <= 82) return code === 82 ? 'heavy-rain' : 'rain'; // showers
  if (code >= 85 && code <= 86) return code === 86 ? 'heavy-snow' : 'snow'; // snow showers
  if (code >= 95 && code <= 99) return 'thunderstorm';
  return 'cloudy';
}

function parseWeatherResponse(data: any): WeatherData {
  const current = data.current;
  const code = current.weather_code;
  const condition = mapWMOCodeToCondition(code);
  
  // Calculate precipitation intensity based on weather code
  let precipitationIntensity = 0;
  if (code >= 51 && code <= 55) precipitationIntensity = 0.2 + (code - 51) * 0.1;
  if (code >= 61 && code <= 65) precipitationIntensity = 0.4 + (code - 61) * 0.2;
  if (code >= 80 && code <= 82) precipitationIntensity = 0.5 + (code - 80) * 0.2;
  if (code >= 71 && code <= 75) precipitationIntensity = 0.3 + (code - 71) * 0.15;
  if (code >= 95) precipitationIntensity = 1;

  return {
    condition,
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    cloudCover: current.cloud_cover,
    isRaining: [51, 52, 53, 54, 55, 56, 57, 61, 62, 63, 64, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code),
    isSnowing: [71, 72, 73, 74, 75, 77, 85, 86].includes(code),
    isFoggy: [45, 48].includes(code),
    isThunderstorm: code >= 95 && code <= 99,
    precipitationIntensity,
  };
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: 'temperature_2m,relative_humidity_2m,weather_code,cloud_cover,wind_speed_10m',
    timezone: 'auto',
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }
  
  const data = await response.json();
  return parseWeatherResponse(data);
}

// Default UK coordinates (London) as fallback
const DEFAULT_COORDS = { lat: 51.5074, lon: -0.1278 };

export function useWeatherData() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [coordsError, setCoordsError] = useState<string | null>(null);

  useEffect(() => {
    async function getLocation() {
      try {
        // Check for cached coordinates first
        const cached = localStorage.getItem('gridgreen-coords');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.lat && parsed.lon) {
              setCoords(parsed);
              return;
            }
          } catch {
            // Invalid cached data, continue to get new location
          }
        }

        // Try to get current position - use browser API in web, Capacitor on native
        let latitude: number;
        let longitude: number;

        if (Capacitor.isNativePlatform()) {
          // Native: use Capacitor Geolocation
          const position = await Geolocation.getCurrentPosition({ timeout: 5000 });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } else if ('geolocation' in navigator) {
          // Web: use browser Geolocation API
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } else {
          // No geolocation available, use default
          throw new Error('Geolocation not available');
        }

        const newCoords = { lat: latitude, lon: longitude };
        localStorage.setItem('gridgreen-coords', JSON.stringify(newCoords));
        setCoords(newCoords);
      } catch (error) {
        console.warn('Could not get location for weather, using default:', error);
        setCoordsError('Location unavailable, using London weather');
        setCoords(DEFAULT_COORDS);
      }
    }

    getLocation();
  }, []);

  const query = useQuery<WeatherData>({
    queryKey: ['weather', coords?.lat, coords?.lon],
    queryFn: () => {
      if (!coords) throw new Error('No coordinates');
      return fetchWeather(coords.lat, coords.lon);
    },
    enabled: !!coords,
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 30, // 30 minutes
    retry: 2,
  });

  // Return default weather if no data yet
  const defaultWeather: WeatherData = {
    condition: 'clear',
    temperature: 15,
    humidity: 50,
    windSpeed: 10,
    cloudCover: 30,
    isRaining: false,
    isSnowing: false,
    isFoggy: false,
    isThunderstorm: false,
    precipitationIntensity: 0,
  };

  return {
    weather: query.data ?? defaultWeather,
    isLoading: query.isLoading || !coords,
    error: query.error || coordsError,
  };
}
