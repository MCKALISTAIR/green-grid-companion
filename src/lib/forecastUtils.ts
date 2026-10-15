import { ForecastData } from '@/lib/carbonApi';
import { parseISO, isBefore } from 'date-fns';

function isUsable(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

/**
 * The one gCO₂/kWh value a forecast slot shows: the actual (or GridSense
 * estimate) once the half-hour has ended, otherwise NESO's forecast. The bar,
 * its label, its tooltip and the hour insight all read this, so they can't
 * disagree. null = no usable value (show "?" / no data, never 0).
 */
export function getSlotDisplayValue(item: ForecastData, now: Date): number | null {
  const forecast = item.intensity?.forecast;
  const actual = item.intensity?.actual;
  const end = Date.parse(item.to);
  const hasEnded = Number.isFinite(end) && end < now.getTime();
  if (hasEnded && isUsable(actual)) return actual;
  return isUsable(forecast) ? forecast : null;
}

export function getForecastMax(forecast: ForecastData[], now: Date = new Date()): number {
  const values = forecast.map((d) => getSlotDisplayValue(d, now)).filter(isUsable);
  return Math.max(...values, 200);
}

export function getForecastDifferences(item: ForecastData, now: Date) {
  const time = parseISO(item.from);
  const end = parseISO(item.to);
  const isUnknown =
    !item.intensity || item.intensity.forecast === null || item.intensity.forecast === undefined;
  const isPast = isBefore(end, now);
  const isCurrentHour = !isBefore(now, time) && isBefore(now, end);

  const hasActual = item.intensity.actual !== undefined && item.intensity.actual !== null && isPast;
  const difference = hasActual ? item.intensity.actual - item.intensity.forecast : 0;
  const showDifference = hasActual && Math.abs(difference) > 0;

  return { time, isUnknown, isPast, isCurrentHour, hasActual, difference, showDifference };
}
