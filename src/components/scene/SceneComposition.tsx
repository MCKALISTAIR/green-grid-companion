import { motion } from 'framer-motion';
import { CleanlinessBand } from '@/hooks/useCleanlinessBand';
import {} from '@/hooks/useSceneType';

interface SpotlightProps {
  band: CleanlinessBand;
  isCity: boolean;
  isCoastal: boolean;
  isNight: boolean;
}

/**
 * Soft radial halo placed behind the "hero" prop for the current cleanliness band.
 * Purely additive — the rest of the scene stays untouched. This gives composition
 * a focal point without restructuring the layout (respects scene-visual-integrity).
 *
 * Hero positions per scene type (% of scene container):
 *
 * City:
 *   very-clean → London Eye           (~22% x, 55% y)
 *   clean      → upper-mid skyline    (~50% x, 45% y)
 *   moderate   → BESS container       (~82% x, 72% y)
 *   dirty      → distant stack        (~91% x, 50% y)
 *   very-dirty → smog band            (~50% x, 30% y, wider)
 *
 * Countryside:
 *   very-clean → wind turbine cluster (~30% x, 65% y)
 *   clean      → hillside             (~50% x, 55% y)
 *   moderate   → hydro dam            (~75% x, 60% y)
 *   dirty      → factory smoke        (~35% x, 45% y)
 *   very-dirty → smog band            (~50% x, 28% y, wide)
 *
 * Coastal:
 *   very-clean → offshore wind        (~38% x, 52% y)
 *   clean      → sailing boat         (~42% x, 58% y)
 *   moderate   → rock pool area       (~68% x, 72% y)
 *   dirty      → horizon smog         (~50% x, 42% y)
 *   very-dirty → smog band            (~50% x, 28% y, wide)
 */

type HeroConfig = Record<CleanlinessBand, { x: number; y: number; size: number; tint: string }>;

const CITY_HEROES: HeroConfig = {
  'very-clean': { x: 22, y: 55, size: 24, tint: 'rgba(180,255,220,0.40)' },
  clean: { x: 50, y: 45, size: 26, tint: 'rgba(160,230,200,0.32)' },
  moderate: { x: 82, y: 72, size: 18, tint: 'rgba(245,200,120,0.36)' },
  dirty: { x: 91, y: 50, size: 20, tint: 'rgba(220,140,90,0.40)' },
  'very-dirty': { x: 50, y: 30, size: 42, tint: 'rgba(180,90,50,0.45)' },
};

const COUNTRYSIDE_HEROES: HeroConfig = {
  'very-clean': { x: 30, y: 58, size: 22, tint: 'rgba(180,255,220,0.38)' },
  clean: { x: 50, y: 55, size: 24, tint: 'rgba(160,230,200,0.30)' },
  moderate: { x: 75, y: 60, size: 20, tint: 'rgba(245,200,120,0.34)' },
  dirty: { x: 35, y: 45, size: 24, tint: 'rgba(220,140,90,0.38)' },
  'very-dirty': { x: 50, y: 28, size: 44, tint: 'rgba(180,90,50,0.42)' },
};

const COASTAL_HEROES: HeroConfig = {
  'very-clean': { x: 38, y: 52, size: 26, tint: 'rgba(180,255,220,0.42)' },
  clean: { x: 42, y: 58, size: 24, tint: 'rgba(160,230,200,0.35)' },
  moderate: { x: 68, y: 72, size: 20, tint: 'rgba(245,200,120,0.36)' },
  dirty: { x: 55, y: 48, size: 26, tint: 'rgba(220,140,90,0.42)' },
  'very-dirty': { x: 50, y: 30, size: 48, tint: 'rgba(180,90,50,0.48)' },
};

export function SceneHeroSpotlight({ band, isCity, isCoastal, isNight }: SpotlightProps) {
  const heroMap = isCity ? CITY_HEROES : isCoastal ? COASTAL_HEROES : COUNTRYSIDE_HEROES;
  const h = heroMap[band];
  const dimmer = isNight ? 0.75 : 1;

  return (
    <motion.div
      className="absolute inset-0 z-[3] pointer-events-none"
      aria-hidden="true"
      animate={{
        background: `radial-gradient(ellipse ${h.size}% ${h.size * 0.9}% at ${h.x}% ${h.y}%, ${h.tint}, rgba(0,0,0,0) 70%)`,
        opacity: dimmer,
      }}
      transition={{ duration: 1.8, ease: 'easeInOut' as const }}
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

interface DepthProps {
  cleanliness: number;
  isNight: boolean;
}

/**
 * Atmospheric perspective layer — a thin horizontal haze near the horizon that
 * desaturates the distant skyline and gives the scene 1-2 extra readable depth
 * planes without adding new SVG geometry.
 *
 * Dirty days = warmer/heavier haze, clean days = cooler/lighter.
 * Constrained to the 40–68% vertical band (top: 40%, height: 28%) per QA spec.
 * Sits at z-[2], below SceneHeroSpotlight (z-[3]) so haze does not mute the halo.
 */
export function SceneAtmosphericDepth({ cleanliness, isNight }: DepthProps) {
  // Haze for depth — keep it airy. Cap so dirty days don't paint an opaque
  // muddy bar across mid-scene (common UK live intensities are dirty/high).
  const intensity = Math.min(0.14, 0.06 + (1 - cleanliness) * 0.08);
  // Hue: cool blue when clean, warm sepia when dirty.
  const hue = cleanliness > 0.5 ? 210 : 28;
  const sat = cleanliness > 0.5 ? 32 : 22;
  const light = isNight ? 28 : cleanliness > 0.5 ? 72 : 58;

  return (
    <motion.div
      className="absolute inset-x-0 z-[2] pointer-events-none"
      aria-hidden="true"
      style={{
        top: '42%',
        height: '22%',
        maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
      }}
      animate={{
        background: `linear-gradient(to bottom,
                    hsla(${hue}, ${sat}%, ${light}%, 0) 0%,
                    hsla(${hue}, ${sat}%, ${light}%, ${intensity * 0.5}) 30%,
                    hsla(${hue}, ${sat}%, ${light}%, ${intensity}) 50%,
                    hsla(${hue}, ${sat}%, ${light}%, ${intensity * 0.5}) 70%,
                    hsla(${hue}, ${sat}%, ${light}%, 0) 100%)`,
      }}
      transition={{ duration: 2.2, ease: 'easeInOut' as const }}
    />
  );
}
