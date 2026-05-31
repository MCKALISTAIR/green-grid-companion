import { ForecastData } from '@/lib/carbonApi';
import { parseISO, isBefore } from 'date-fns';

export function getForecastMax(forecast: ForecastData[]): number {
    return Math.max(...forecast.map(d => d.intensity.forecast), 200);
}

export function getForecastDifferences(item: ForecastData, now: Date) {
    const time = parseISO(item.from);
    const isUnknown = !item.intensity || item.intensity.forecast === null || item.intensity.forecast === undefined;
    const isPast = isBefore(time, now);
    const isCurrentHour = time.getTime() === now.getTime();

    const hasActual = item.intensity.actual !== undefined && item.intensity.actual !== null && isPast;
    const difference = hasActual ? item.intensity.actual - item.intensity.forecast : 0;
    const showDifference = hasActual && Math.abs(difference) > 0;

    return { time, isUnknown, isPast, isCurrentHour, hasActual, difference, showDifference };
}
