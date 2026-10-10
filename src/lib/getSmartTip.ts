import type { ForecastData } from '@/lib/carbonApi';
import { getNowOrWaitDecision } from '@/lib/nowOrWait';

/**
 * Short energy tip that is the now-or-wait answer in one line
 * ("Wait about 2 hours. It'll be around 40% cleaner ..."), so older call
 * sites can never disagree with the home card.
 */
export function getSmartTip(current: number, forecast: ForecastData[]): string {
  const d = getNowOrWaitDecision(current, forecast);
  return `${d.headline}. ${d.detail}`;
}
