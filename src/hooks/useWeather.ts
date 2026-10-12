import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppLocation } from '@/contexts/LocationContext';
import { roundCoord } from '@/lib/coords';

export interface WeatherData {
    current: {
        temperature_2m: number;
        wind_speed_10m: number;
        cloud_cover: number;
        weather_code: number;
    };
    current_units: {
        temperature_2m: string;
        wind_speed_10m: string;
        cloud_cover: string;
    };
}

export function useWeather(lat?: number, lon?: number) {
    // Integrate with LocationManager context
    const { coordinates } = useAppLocation();

    // Prioritize passed arguments, then context coordinates, then default to London
    // Rounded to 2 dp on the device before the call (the edge function rounds again).
    const effectiveLat = roundCoord(lat ?? coordinates?.lat ?? 51.5074);
    const effectiveLon = roundCoord(lon ?? coordinates?.lon ?? -0.1278);

    return useQuery<WeatherData>({
        queryKey: ['weather', effectiveLat, effectiveLon],
        queryFn: async () => {
            const { data, error } = await supabase.functions.invoke('weather', {
                body: { lat: effectiveLat, lon: effectiveLon }
            });

            if (error) throw new Error(error.message);
            return data;
        },
        refetchInterval: 1000 * 60 * 30, // 30 mins
        staleTime: 1000 * 60 * 15,
        retry: 1,
    });
}
