import { parseISO } from 'date-fns';
import type { ForecastData } from '@/lib/carbonApi';

/** Number of 30-minute forecast slots in an optimal window (3 hours). */
export const OPTIMAL_WINDOW_SLOTS = 6;

export interface ForecastWindow {
  bestStart: Date;
  bestEnd: Date;
  worstStart: Date;
  worstEnd: Date;
  minAvg: number;
  maxAvg: number;
}

/** Find the best and worst contiguous 3-hour windows in the future forecast. */
export function getBestWorstWindows(forecast: ForecastData[]): ForecastWindow | null {
  if (forecast.length < OPTIMAL_WINDOW_SLOTS) return null;

  const now = new Date();
  const futureForecast = forecast.filter((f) => new Date(f.to) > now);
  if (futureForecast.length < OPTIMAL_WINDOW_SLOTS) return null;

  let minSum = Infinity;
  let minStartIndex = 0;
  let maxSum = 0;
  let maxStartIndex = 0;

  for (let i = 0; i <= futureForecast.length - OPTIMAL_WINDOW_SLOTS; i++) {
    const sum = futureForecast
      .slice(i, i + OPTIMAL_WINDOW_SLOTS)
      .reduce((acc, f) => acc + f.intensity.forecast, 0);
    if (sum < minSum) {
      minSum = sum;
      minStartIndex = i;
    }
    if (sum > maxSum) {
      maxSum = sum;
      maxStartIndex = i;
    }
  }

  return {
    bestStart: parseISO(futureForecast[minStartIndex].from),
    bestEnd: parseISO(futureForecast[minStartIndex + OPTIMAL_WINDOW_SLOTS - 1].to),
    worstStart: parseISO(futureForecast[maxStartIndex].from),
    worstEnd: parseISO(futureForecast[maxStartIndex + OPTIMAL_WINDOW_SLOTS - 1].to),
    minAvg: Math.round(minSum / OPTIMAL_WINDOW_SLOTS),
    maxAvg: Math.round(maxSum / OPTIMAL_WINDOW_SLOTS),
  };
}
