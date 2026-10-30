import { useEffect, useRef, useState } from 'react';
import { bandFor, type NesoBand } from '@/lib/nesoBand';

export type CleanlinessBand = 'very-clean' | 'clean' | 'moderate' | 'dirty' | 'very-dirty';

const FROM_NESO: Record<NesoBand, CleanlinessBand> = {
  'very low': 'very-clean',
  low: 'clean',
  moderate: 'moderate',
  high: 'dirty',
  'very high': 'very-dirty',
};

/** BH-139: same bands as the hero label (NESO index, else NESO 2026 bands). */
export function getCleanlinessBand(intensity: number, index?: string | null): CleanlinessBand {
  return FROM_NESO[bandFor(intensity, index)];
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
export function useCleanlinessBand(intensity: number, clearAfterMs = 3500, index?: string | null) {
  const band = getCleanlinessBand(intensity, index);
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
