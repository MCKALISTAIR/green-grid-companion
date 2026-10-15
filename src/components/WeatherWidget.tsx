import { useState, useEffect } from 'react';
import {
  Cloud,
  Wind,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Thermometer,
  X,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWeather } from '@/hooks/useWeather';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

const WEATHER_WIDGET_HIDDEN_KEY = 'gridsense-weather-widget-hidden';

export function WeatherWidget() {
  const { data, isLoading, error } = useWeather();
  const [isHidden, setIsHidden] = useState(() => {
    return localStorage.getItem(WEATHER_WIDGET_HIDDEN_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(WEATHER_WIDGET_HIDDEN_KEY, isHidden.toString());
  }, [isHidden]);

  const handleHide = () => setIsHidden(true);
  const handleShow = () => setIsHidden(false);

  if (isLoading) {
    return <Skeleton className="h-16 w-full rounded-xl" />;
  }

  if (error || !data) {
    return null;
  }

  if (isHidden) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleShow}
        className="w-full justify-start gap-2 text-xs border-dashed"
      >
        <Eye className="w-3.5 h-3.5" />
        Show Local Weather
      </Button>
    );
  }

  const current = data?.current;
  const current_units = data?.current_units;

  if (!current || !current_units) {
    return null;
  }

  const isHighWind = current.wind_speed_10m > 15;
  const isSunny = current.cloud_cover < 30;

  const getWeatherIcon = (code: number) => {
    if (code <= 3) {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 18, ease: 'linear' as const }}
        >
          <Sun className="w-5 h-5 text-amber-500" />
        </motion.div>
      );
    }
    if (code <= 48) {
      return (
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' as const }}
        >
          <Cloud className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      );
    }
    if (code <= 67) {
      return (
        <motion.div
          animate={{ y: [0, 1.5, 0], x: [0, -0.5, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' as const }}
        >
          <CloudRain className="w-5 h-5 text-blue-500" />
        </motion.div>
      );
    }
    if (code <= 77) {
      return (
        <motion.div
          animate={{ y: [0, 1, 0], x: [0, 1, -1, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' as const }}
        >
          <CloudSnow className="w-5 h-5 text-sky-300" />
        </motion.div>
      );
    }
    return (
      <motion.div
        animate={{ scale: [1, 1.05, 0.95, 1], opacity: [1, 0.7, 1] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' as const }}
      >
        <CloudLightning className="w-5 h-5 text-purple-500" />
      </motion.div>
    );
  };

  const getWeatherLabel = (code: number) => {
    if (code <= 1) return 'Clear';
    if (code <= 3) return 'Partly cloudy';
    if (code <= 48) return 'Overcast';
    if (code <= 57) return 'Drizzle';
    if (code <= 67) return 'Rain';
    if (code <= 77) return 'Snow';
    return 'Thunderstorm';
  };

  return (
    <div className="relative rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden weather-widget-container">
      {/* Dismiss button */}
      <button
        onClick={handleHide}
        className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-muted-foreground hover:bg-muted/50 transition-colors z-10 weather-widget-absolute-close"
        aria-label="Hide weather widget"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="px-3 py-2.5 weather-widget-inner">
        {/* Weather icon & condition */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 p-1.5 rounded-lg bg-muted/50">
            {getWeatherIcon(current.weather_code)}
          </div>
          <p className="text-sm font-medium truncate">{getWeatherLabel(current.weather_code)}</p>
        </div>

        {/* Stats - compact */}
        <div className="flex items-center gap-2.5 text-sm weather-widget-stats">
          <span className="flex items-center gap-1">
            <motion.div
              animate={{ y: [0, -1, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' as const }}
            >
              <Thermometer className="w-3.5 h-3.5 text-muted-foreground" />
            </motion.div>
            <span className="font-medium tabular-nums">{current.temperature_2m}°</span>
          </span>
          <span className="flex items-center gap-1">
            <motion.div
              animate={{ x: [-1.5, 1.5, -1.5] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' as const }}
            >
              <Wind className="w-3.5 h-3.5 text-muted-foreground" />
            </motion.div>
            <span className="font-medium tabular-nums">
              {current.wind_speed_10m}
              <span className="text-xs text-muted-foreground">{current_units.wind_speed_10m}</span>
            </span>
          </span>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleHide}
          className="ml-auto p-1 rounded-full text-muted-foreground hover:text-muted-foreground hover:bg-muted/50 transition-colors weather-widget-close-btn"
          aria-label="Hide weather widget"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Renewable boost indicator */}
      {(isHighWind || isSunny) && (
        <div
          className={`px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 ${
            isHighWind
              ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
          }`}
        >
          {isHighWind ? <Wind className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
          {isHighWind
            ? 'Windy conditions — good for wind generation'
            : 'Clear skies — good for solar generation'}
        </div>
      )}
    </div>
  );
}
