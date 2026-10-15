import { useQuery } from '@tanstack/react-query';
import { useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  GridDataUnavailableError,
  gridDemandUnavailableReason,
  liveGridFrequency,
} from '@/lib/gridDemand';

export interface GenerationSourceMW {
  id: string;
  name: string;
  fuel: string; // Required by GenerationMixBar
  perc: number;
  mw: number | null;
}

/**
 * Response of supabase/functions/grid-demand (see _shared/grid-demand.ts).
 * `timestamp` is the time the figures describe (Elexon FUELINST interval
 * start), not when the request ran. Null when status is "unavailable".
 */
export interface GridDemandData {
  status: 'ok' | 'unavailable';
  reason?: string;
  timestamp: string | null;
  dataTime: string | null;
  fetchedAt: string;
  settlementDate?: string | null;
  settlementPeriod?: number | null;
  totalDemandMW: number | null;
  totalSupplyMW?: number | null;
  gridFrequency: number | null;
  frequencyTime: string | null;
  embeddedSolarMW: number | null;
  embeddedWindMW: number | null;
  embeddedIsEstimate?: boolean;
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
          fuel: item.fuel || item.name, // Ensure fuel is present for UI components
        }));
      }

      return data;
    },
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
  });

  // Only show figures that are live (status ok, recent data time). Old or
  // unavailable responses are hidden rather than shown with a "stale" badge.
  const unavailableReason = gridDemandUnavailableReason(data);
  const live = unavailableReason === null ? data : undefined;

  // Compute mix with trend data
  const mixWithTrends: MixWithTrend[] = useMemo(() => {
    if (!live?.mix) return [];
    const data = live;

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
  }, [live]);

  return {
    demand: live?.totalDemandMW ?? null,
    frequency: liveGridFrequency(data),
    // NESO's embedded solar estimate covers all solar that isn't metered on the
    // transmission network (rooftop *and* most solar farms), and FUELINST has
    // no solar at all, so there is no honest utility-scale vs rooftop split.
    // Null hides that split; the raw figure is still in the response.
    embeddedSolarMW: null,
    embeddedWindMW: live?.embeddedWindMW ?? null,
    mix: live?.mix || [],
    mixWithTrends,
    lastUpdated: live?.timestamp ?? undefined,
    isLoading,
    error:
      error ?? (data && unavailableReason ? new GridDataUnavailableError(unavailableReason) : null),
    refetch,
  };
}
