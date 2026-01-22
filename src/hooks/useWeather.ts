import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export function useWeather(lat: number = 51.5074, lon: number = -0.1278) {
    // Default to London if no coords provided. 
    // TODO: Integrate with LocationManager context later.

    return useQuery<WeatherData>({
        queryKey: ['weather', lat, lon],
        queryFn: async () => {
            const { data, error } = await supabase.functions.invoke('weather', {
                body: { lat, lon }
            });

            if (error) throw new Error(error.message);
            return data;
        },
        refetchInterval: 1000 * 60 * 30, // 30 mins
        staleTime: 1000 * 60 * 15,
        retry: 1,
    });
}
