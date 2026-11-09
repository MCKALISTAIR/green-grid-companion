const HALF_HOUR = 30 * 60_000;
const BUFFER = 90_000;
export function nextCarbonRefreshDelay(now = Date.now()): number {
  return (Math.floor((now - BUFFER) / HALF_HOUR) + 1) * HALF_HOUR + BUFFER - now;
}
export function latestCarbonRefreshTarget(now: number): number {
  return Math.floor((now - BUFFER) / HALF_HOUR) * HALF_HOUR + BUFFER;
}
