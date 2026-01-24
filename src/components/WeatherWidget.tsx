import { useState, useEffect } from 'react';
import { Cloud, Wind, Sun, CloudRain, CloudSnow, CloudLightning, X, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWeather } from '@/hooks/useWeather';
import { Skeleton } from '@/components/ui/skeleton';

const WEATHER_WIDGET_HIDDEN_KEY = 'gridsense-weather-widget-hidden';

export function WeatherWidget() {
    const { data, isLoading, error } = useWeather();
    const [isHidden, setIsHidden] = useState(() => {
        return localStorage.getItem(WEATHER_WIDGET_HIDDEN_KEY) === 'true';
    });

    useEffect(() => {
        localStorage.setItem(WEATHER_WIDGET_HIDDEN_KEY, isHidden.toString());
    }, [isHidden]);

    const handleHide = () => {
        setIsHidden(true);
    };

    const handleShow = () => {
        setIsHidden(false);
    };

    if (isLoading) {
        return <Skeleton className="h-24 w-full rounded-xl" />;
    }

    if (error || !data) {
        return null; // Hide if weather fails, it's secondary info
    }

    // If hidden, show a compact button to restore it
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

    const { current, current_units } = data;
    const isHighWind = current.wind_speed_10m > 15; // > 15mph is breezy
    const isSunny = current.cloud_cover < 30; // < 30% cloud

    // Map WMO codes to icons
    const getWeatherIcon = (code: number) => {
        if (code <= 3) return <Sun className="w-5 h-5 text-orange-500" />;
        if (code <= 48) return <Cloud className="w-5 h-5 text-gray-400" />;
        if (code <= 67) return <CloudRain className="w-5 h-5 text-blue-400" />;
        if (code <= 77) return <CloudSnow className="w-5 h-5 text-white" />;
        return <CloudLightning className="w-5 h-5 text-purple-400" />;
    };

    return (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900 relative">
            {/* Close button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={handleHide}
                className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 shadow-sm"
                aria-label="Hide weather widget"
            >
                <X className="w-3 h-3" />
            </Button>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/50 dark:bg-white/10 rounded-full shadow-sm">
                        {getWeatherIcon(current.weather_code)}
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">Local Conditions</h3>
                        <p className="text-xs text-muted-foreground">
                            {current.temperature_2m}{current_units.temperature_2m} • {current.wind_speed_10m}{current_units.wind_speed_10m} Wind
                        </p>
                    </div>
                </div>

                {/* Insight Badge */}
                {(isHighWind || isSunny) && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/60 dark:bg-black/20 text-xs font-medium text-blue-700 dark:text-blue-300">
                        {isHighWind ? <Wind className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                        <span>{isHighWind ? 'Windy boost' : 'Solar boost'}</span>
                    </div>
                )}
            </div>
        </Card>
    );
}
