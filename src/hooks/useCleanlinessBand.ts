import { useEffect, useRef, useState } from 'react';

export type CleanlinessBand = 'very-clean' | 'clean' | 'moderate' | 'dirty' | 'very-dirty';

export function getCleanlinessBand(intensity: number): CleanlinessBand {
  if (intensity < 50) return 'very-clean';
  if (intensity < 150) return 'clean';
  if (intensity < 250) return 'moderate';
  if (intensity < 350) return 'dirty';
  return 'very-dirty';
}

const ORDER: CleanlinessBand[] = ['very-clean', 'clean', 'moderate', 'dirty', 'very-dirty'];

export interface BandTransition {
  from: CleanlinessBand;
  to: CleanlinessBand;
  direction: 'cleaner' | 'dirtier';
  at: number;
}

/**
 * Derive a discrete cleanliness band and report transitions.
 * The transition fires once when the band changes, then clears after `clearAfterMs`.
 */
export function useCleanlinessBand(intensity: number, clearAfterMs = 3500) {
  const band = getCleanlinessBand(intensity);
  const prevRef = useRef<CleanlinessBand>(band);
  const [transition, setTransition] = useState<BandTransition | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev !== band) {
      const direction: 'cleaner' | 'dirtier' =
        ORDER.indexOf(band) < ORDER.indexOf(prev) ? 'cleaner' : 'dirtier';
      setTransition({ from: prev, to: band, direction, at: Date.now() });
      prevRef.current = band;
      const t = setTimeout(() => setTransition(null), clearAfterMs);
      return () => clearTimeout(t);
    }
  }, [band, clearAfterMs]);

  return { band, transition };
}
