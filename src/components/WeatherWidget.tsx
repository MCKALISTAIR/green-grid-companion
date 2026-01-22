import { Cloud, Wind, Sun, CloudRain, CloudSnow, CloudLightning } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useWeather } from '@/hooks/useWeather';
import { Skeleton } from '@/components/ui/skeleton';

export function WeatherWidget() {
    const { data, isLoading, error } = useWeather();
    // TODO: Get coords from user location preference

    if (isLoading) {
        return <Skeleton className="h-24 w-full rounded-xl" />;
    }

    if (error || !data) {
        return null; // Hide if weather fails, it's secondary info
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
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900">
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
