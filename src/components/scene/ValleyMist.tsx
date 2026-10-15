import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useId } from 'react';

interface ValleyMistProps {
  cleanliness: number;
  timeOfDay?: string;
  isNight?: boolean;
}

export function ValleyMist({ cleanliness, timeOfDay, isNight }: ValleyMistProps) {
  const reduced = useReducedMotion();
  const id = useId();

  // Show mist in dawn, morning, sunset, or dusk. Keep midday and full night clear.
  const isVisible =
    timeOfDay === 'dawn' ||
    timeOfDay === 'morning' ||
    timeOfDay === 'sunset' ||
    timeOfDay === 'dusk';
  if (!isVisible) return null;

  // Tint of mist: cool blue on clean days, warm sepia on dirty days
  const hue = cleanliness > 0.5 ? 200 : 35;
  const sat = cleanliness > 0.5 ? '25%' : '18%';
  const light = isNight ? 25 : 88;
  const mistColor = `hsl(${hue} ${sat} ${light}% / 0.15)`;

  const mistAnimate = reduced ? { x: 0 } : { x: ['-6%', '6%', '-6%'] };

  // CSS gradients only — the previous SVG feGaussianBlur on a non-uniformly
  // stretched (preserveAspectRatio="none") + translated group rendered as an
  // opaque black slab with a hard right edge on wide desktop viewports
  // (filter region clipped / GPU filter failure). Feathered on all edges.
  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 pointer-events-none z-[15] overflow-hidden"
      style={{
        height: '40%',
        transform: 'translateY(5px)',
        maskImage:
          'linear-gradient(to right, transparent, black 12%, black 88%, transparent), linear-gradient(to bottom, transparent, black 35%, black 75%, transparent)',
        maskComposite: 'intersect',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 12%, black 88%, transparent), linear-gradient(to bottom, transparent, black 35%, black 75%, transparent)',
        WebkitMaskComposite: 'source-in',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2 }}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-y-0 -inset-x-[10%]"
        style={{
          background: `radial-gradient(ellipse 60% 55% at 30% 60%, ${mistColor}, transparent 70%), radial-gradient(ellipse 60% 55% at 72% 68%, ${mistColor}, transparent 70%)`,
        }}
        animate={mistAnimate}
        transition={{ duration: 38, repeat: Infinity, ease: 'easeInOut' as const }}
      />
    </motion.div>
  );
}
