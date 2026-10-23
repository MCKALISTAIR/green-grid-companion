/**
 * Where the scene's sun is computed for. Fed by useWeatherData's already-resolved
 * coordinates (postcode or device, 2 dp); falls back to the cached device coords,
 * then London. In memory only: nothing new is stored or sent.
 */
import { roundCoords } from '@/lib/coords';

export const LONDON = { lat: 51.51, lon: -0.13 };

type Coords = { lat: number; lon: number };
let current: Coords | null = null;
const listeners = new Set<() => void>();

export function setSceneLocation(c: Coords | null) {
  const next = c ? roundCoords(c) : null;
  if (next && current && next.lat === current.lat && next.lon === current.lon) return;
  current = next;
  listeners.forEach((l) => l());
}

export function getSceneLocation(): Coords {
  if (current) return current;
  try {
    const cached = JSON.parse(localStorage.getItem('gridgreen-coords') || 'null');
    if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lon))
      return roundCoords(cached);
  } catch {
    /* ignore */
  }
  return LONDON;
}

export function subscribeSceneLocation(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
