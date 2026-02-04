import { useQuery } from '@tanstack/react-query';
import { useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GenerationSourceMW {
    id: string;
    name: string;
    fuel: string; // Required by GenerationMixBar
    perc: number;
    mw: number | null;
}

export interface GridDemandData {
    timestamp: string;
    settlementDate: string | null;
    settlementPeriod: number | null;
    totalDemandMW: number | null;
    gridFrequency: number | null;
    mix: GenerationSourceMW[];
}

export interface MixWithTrend extends GenerationSourceMW {
    previousPerc: number | null;
    trend: 'up' | 'down' | 'stable' | null;
}

export function useGridDemand() {
    // Store previous mix values for trend comparison
    const previousMixRef = useRef<Map<string, number>>(new Map());
    const lastTimestampRef = useRef<string | null>(null);

    const { data, isLoading, error, refetch } = useQuery<GridDemandData>({
        queryKey: ['grid-demand'],
        queryFn: async () => {
            const { data, error } = await supabase.functions.invoke('grid-demand');
            if (error) throw error;

            // Allow for graceful handling if mix is missing or needs mapping
            if (data?.mix) {
                data.mix = data.mix.map((item: Partial<GenerationSourceMW>) => ({
                    ...item,
                    fuel: item.fuel || item.name // Ensure fuel is present for UI components
                }));
            }

            return data;
        },
        refetchInterval: 1000 * 60 * 5, // 5 minutes
        staleTime: 1000 * 60 * 2, // 2 minutes
        retry: 2,
    });

    // Compute mix with trend data
    const mixWithTrends: MixWithTrend[] = useMemo(() => {
        if (!data?.mix) return [];

        const isNewData = data.timestamp !== lastTimestampRef.current;
        const result: MixWithTrend[] = [];

        for (const source of data.mix) {
            const fuelKey = source.fuel?.toLowerCase() || source.name?.toLowerCase() || source.id;
            const previousPerc = previousMixRef.current.get(fuelKey) ?? null;
            
            let trend: 'up' | 'down' | 'stable' | null = null;
            
            if (previousPerc !== null && isNewData) {
                const diff = source.perc - previousPerc;
                // Only show trend if change is >= 0.5% to avoid noise
                if (diff >= 0.5) {
                    trend = 'up';
                } else if (diff <= -0.5) {
                    trend = 'down';
                } else {
                    trend = 'stable';
                }
            }

            result.push({
                ...source,
                previousPerc,
                trend,
            });
        }

        // Update previous values for next comparison (only when we get new data)
        if (isNewData && data.mix.length > 0) {
            previousMixRef.current.clear();
            for (const source of data.mix) {
                const fuelKey = source.fuel?.toLowerCase() || source.name?.toLowerCase() || source.id;
                previousMixRef.current.set(fuelKey, source.perc);
            }
            lastTimestampRef.current = data.timestamp;
        }

        return result;
    }, [data]);

    return {
        demand: data?.totalDemandMW,
        frequency: data?.gridFrequency,
        mix: data?.mix || [],
        mixWithTrends,
        lastUpdated: data?.timestamp,
        isLoading,
        error,
        refetch,
    };
}
