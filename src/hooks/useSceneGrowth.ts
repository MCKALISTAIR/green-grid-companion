import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNationalHistoryAndForecast, getRegionalHistoryAndForecast } from '@/lib/carbonApi';
import { countLowCarbonDays, gardenWindowRange } from '@/lib/gardenGrowth';
import { londonDateKey } from '@/lib/londonTime';
import { nesoBand } from '@/lib/nesoBand';

export type SceneGrowthStage = 0 | 1 | 2 | 3 | 4;

export interface SceneGrowth {
  /** 0 sparse → 4 lush; driven by low-carbon days in the last 14 (BH-143). */
  stage: SceneGrowthStage;
  /** Days in the last 14 whose daily average was low or very low (for copy). */
  gardenDays: number;
  /** True while the current reading is itself low or very low. */
  isGrowing: boolean;
}

/** Map low-carbon days (0-14) into a discrete Carrot-style growth stage. */
export function gardenDaysToStage(gardenDays: number): SceneGrowthStage {
  if (gardenDays >= 14) return 4;
  if (gardenDays >= 7) return 3;
  if (gardenDays >= 3) return 2;
  if (gardenDays >= 1) return 1;
  return 0;
}

/**
 * BH-143: the garden grows from the number of days in the last 14 where the
 * selected area's daily average intensity was in NESO's low or very low band.
 * It thins in dirty weeks and never counts coal or gas streaks.
 *
 * `regionId`: a NESO region id, `null` for Great Britain, `undefined` while the
 * area is still unknown (nothing is fetched and the garden stays sparse).
 */
export function useSceneGrowth(
  intensity: number,
  regionId: number | null | undefined,
): SceneGrowth {
  const dayKey = londonDateKey(new Date());
  const { data: lowDays = 0 } = useQuery<number>({
    queryKey: ['garden-low-days', regionId ?? 'gb', dayKey],
    enabled: regionId !== undefined,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
    queryFn: async ({ signal }) => {
      const now = new Date();
      const { from, to } = gardenWindowRange(now);
      const rows = regionId
        ? await getRegionalHistoryAndForecast(
            regionId,
            from.toISOString(),
            to.toISOString(),
            signal,
          )
        : await getNationalHistoryAndForecast(from.toISOString(), to.toISOString(), signal);
      return countLowCarbonDays(rows, now);
    },
  });

  return useMemo(() => {
    const band = Number.isFinite(intensity) ? nesoBand(intensity) : 'moderate';
    return {
      stage: gardenDaysToStage(lowDays),
      gardenDays: lowDays,
      isGrowing: band === 'very low' || band === 'low',
    };
  }, [lowDays, intensity]);
}
