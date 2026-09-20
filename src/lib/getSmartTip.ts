import type { ForecastData } from '@/lib/carbonApi';
import { getNowOrWaitDecision } from '@/lib/nowOrWait';

/**
 * Short energy tip aligned with the primary now-or-wait decision.
 * Kept as a thin wrapper so older call sites stay consistent.
 */
export function getSmartTip(current: number, forecast: ForecastData[]): string {
  return getNowOrWaitDecision(current, forecast).tip;
}
