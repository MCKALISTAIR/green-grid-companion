import { motion } from 'framer-motion';
import { CleanlinessBand } from '@/hooks/useCleanlinessBand';

interface SpotlightProps {
    band: CleanlinessBand;
    isCity: boolean;
    isNight: boolean;
}

/**
 * Soft radial halo placed behind the "hero" prop for the current cleanliness band.
 * Purely additive — the rest of the scene stays untouched. This gives composition
 * a focal point without restructuring the layout (respects scene-visual-integrity).
 *
 * Approximate hero positions (% of scene):
 *   very-clean → London Eye           (~22% x, 55% y)
 *   clean      → upper-mid skyline    (~50% x, 45% y)
 *   moderate   → BESS container       (~82% x, 72% y)
 *   dirty      → distant stack        (~91% x, 50% y)
 *   very-dirty → smog band            (~50% x, 30% y, wider)
 */
export function SceneHeroSpotlight({ band, isCity, isNight }: SpotlightProps) {
    if (!isCity) return null;

    const heroes: Record<CleanlinessBand, { x: number; y: number; size: number; tint: string }> = {
        'very-clean': { x: 22, y: 55, size: 28, tint: 'rgba(180,255,220,0.55)' },
        clean:       { x: 50, y: 45, size: 32, tint: 'rgba(160,230,200,0.45)' },
        moderate:    { x: 82, y: 72, size: 22, tint: 'rgba(245,200,120,0.45)' },
        dirty:       { x: 91, y: 50, size: 24, tint: 'rgba(220,140,90,0.5)' },
        'very-dirty':{ x: 50, y: 30, size: 50, tint: 'rgba(180,90,50,0.55)' },
    };

    const h = heroes[band];
    const dimmer = isNight ? 0.75 : 1;

    return (
        <motion.div
            className="absolute inset-0 z-[1] pointer-events-none"
            aria-hidden="true"
            animate={{
                background: `radial-gradient(ellipse ${h.size}% ${h.size * 0.9}% at ${h.x}% ${h.y}%, ${h.tint}, rgba(0,0,0,0) 70%)`,
                opacity: dimmer,
            }}
            transition={{ duration: 1.8, ease: 'easeInOut' }}
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
 */
export function SceneAtmosphericDepth({ cleanliness, isNight }: DepthProps) {
    // Haze intensity rises as cleanliness drops.
    const intensity = 0.18 + (1 - cleanliness) * 0.28;
    // Hue: cool blue when clean, warm sepia when dirty.
    const hue = cleanliness > 0.5 ? 210 : 30;
    const sat = cleanliness > 0.5 ? 35 : 25;
    const light = isNight ? 22 : 70;

    return (
        <motion.div
            className="absolute inset-x-0 z-[2] pointer-events-none"
            aria-hidden="true"
            style={{
                top: '40%',
                height: '28%',
            }}
            animate={{
                background: `linear-gradient(to bottom,
                    hsla(${hue}, ${sat}%, ${light}%, 0) 0%,
                    hsla(${hue}, ${sat}%, ${light}%, ${intensity}) 55%,
                    hsla(${hue}, ${sat}%, ${light}%, 0) 100%)`,
            }}
            transition={{ duration: 2.2, ease: 'easeInOut' }}
        />
    );
}
