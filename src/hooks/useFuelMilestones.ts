import { useEffect, useState } from 'react';
import { londonDateKey } from '@/lib/londonTime';
import { MixItem } from '@/lib/generationUtils';

const HISTORY_KEY = 'fuel-history-v1';
const HISTORY_DAYS = 90; // Track 90 days of history

// Fossil fuels to track lows
const FOSSIL_FUELS = ['coal', 'gas', 'oil'];

// Renewables to track highs
const RENEWABLES = ['wind', 'solar', 'hydro'];

interface FuelHistoryEntry {
  date: string; // YYYY-MM-DD
  perc: number;
}

interface FuelHistory {
  [fuel: string]: FuelHistoryEntry[];
}

export interface FuelMilestone {
  fuel: string;
  type: 'low' | 'high';
  currentPerc: number;
  previousBest: number;
  periodDays: number;
}

export function useFuelMilestones(mix: MixItem[]) {
  const [milestones, setMilestones] = useState<FuelMilestone[]>([]);

  useEffect(() => {
    if (!mix || mix.length === 0) return;

    const today = londonDateKey(new Date());

    // Load existing history
    const stored = localStorage.getItem(HISTORY_KEY);
    const history: FuelHistory = stored ? JSON.parse(stored) : {};

    const newMilestones: FuelMilestone[] = [];
    const allFuels = [...FOSSIL_FUELS, ...RENEWABLES];

    for (const fuel of allFuels) {
      const mixItem = mix.find((m) => m.fuel.toLowerCase() === fuel);
      const currentPerc = mixItem?.perc || 0;

      // Initialize history for this fuel if needed
      if (!history[fuel]) {
        history[fuel] = [];
      }

      // Add today's entry (or update if exists)
      const todayIndex = history[fuel].findIndex((e) => e.date === today);
      if (todayIndex >= 0) {
        history[fuel][todayIndex].perc = currentPerc;
      } else {
        history[fuel].push({ date: today, perc: currentPerc });
      }

      // Prune old entries
      const cutoffStr = londonDateKey(new Date(Date.now() - HISTORY_DAYS * 86_400_000));
      history[fuel] = history[fuel].filter((e) => e.date >= cutoffStr);

      // Calculate milestones
      const historicalEntries = history[fuel].filter((e) => e.date !== today);

      if (historicalEntries.length >= 7) {
        // Need at least a week of data
        const isFossil = FOSSIL_FUELS.includes(fuel);
        const isRenewable = RENEWABLES.includes(fuel);

        if (isFossil && currentPerc > 0) {
          // Check if this is the lowest non-zero value
          const nonZeroEntries = historicalEntries.filter((e) => e.perc > 0);
          if (nonZeroEntries.length > 0) {
            const historicalMin = Math.min(...nonZeroEntries.map((e) => e.perc));
            if (currentPerc < historicalMin) {
              newMilestones.push({
                fuel,
                type: 'low',
                currentPerc,
                previousBest: historicalMin,
                periodDays: historicalEntries.length,
              });
            }
          }
        }

        if (isRenewable && currentPerc > 0) {
          // Check if this is the highest value
          const historicalMax = Math.max(...historicalEntries.map((e) => e.perc));
          if (currentPerc > historicalMax) {
            newMilestones.push({
              fuel,
              type: 'high',
              currentPerc,
              previousBest: historicalMax,
              periodDays: historicalEntries.length,
            });
          }
        }
      }
    }

    // Save updated history
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    setMilestones(newMilestones);
  }, [mix]);

  return { milestones };
}

// Get a message for the milestone
export function getMilestoneMessage(milestone: FuelMilestone): string {
  const fuelName = milestone.fuel.charAt(0).toUpperCase() + milestone.fuel.slice(1);
  const periodWeeks = Math.floor(milestone.periodDays / 7);
  const periodText =
    periodWeeks > 4 ? `${Math.floor(periodWeeks / 4)} months` : `${periodWeeks} weeks`;

  if (milestone.type === 'low') {
    return `${fuelName} at ${milestone.currentPerc.toFixed(1)}% — lowest share in ${periodText}`;
  }

  return `${fuelName} at ${milestone.currentPerc.toFixed(1)}% — highest share in ${periodText}! 🎉`;
}
