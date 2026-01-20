import { useQuery } from '@tanstack/react-query';
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
    mix: GenerationSourceMW[];
}

export function useGridDemand() {
    const { data, isLoading, error, refetch } = useQuery<GridDemandData>({
        queryKey: ['grid-demand'],
        queryFn: async () => {
            const { data, error } = await supabase.functions.invoke('grid-demand');
            if (error) throw error;

            // Allow for graceful handling if mix is missing or needs mapping
            if (data?.mix) {
                data.mix = data.mix.map((item: any) => ({
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

    return {
        demand: data?.totalDemandMW,
        mix: data?.mix || [],
        lastUpdated: data?.timestamp,
        isLoading,
        error,
        refetch,
    };
}
