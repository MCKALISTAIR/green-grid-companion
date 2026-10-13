import { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCleanlinessBand } from '@/hooks/useCleanlinessBand';
import { cn } from '@/lib/utils';

interface AnimatedIntensityProps {
  value: number;
  previousValue: number | null;
  animationDuration?: number;
  className?: string;
  /** Pass true while background data is fetching to show a subtle breath animation */
  isUpdating?: boolean;
  /** `hero` = Carrot-style giant readout over the scene */
  size?: 'default' | 'hero';
  /** Stronger outline/shadow for night or dirty skies */
  highContrast?: boolean;
}

export function AnimatedIntensity({
  value,
  previousValue,
  animationDuration = 500,
  className,
  isUpdating = false,
  size = 'default',
  highContrast = false,
}: AnimatedIntensityProps) {
  const [showArrow, setShowArrow] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const hasAnimatedRef = useRef(false);

  // Spring animation for smooth number counting
  // Higher stiffness + lower damping = snappier "clunk" into place
  const springValue = useSpring(value, {
    damping: 20,
    stiffness: 200,
    duration: animationDuration,
  });

  // Transform spring value to rounded integer for display
  const displayValue = useTransform(springValue, (latest) => Math.round(latest));
  const [displayNumber, setDisplayNumber] = useState(value);

  // Subscribe to displayValue changes
  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayNumber(value);
      return;
    }
    const unsubscribe = displayValue.on('change', (latest) => {
      setDisplayNumber(latest);
    });
    return unsubscribe;
  }, [displayValue, shouldReduceMotion, value]);

  // Update spring target when value changes
  useEffect(() => {
    if (!shouldReduceMotion) {
      springValue.set(value);
    } else {
      setDisplayNumber(value);
    }
  }, [value, springValue, shouldReduceMotion]);

  // Detect value changes and trigger animations
  useEffect(() => {
    // Skip initial render
    if (previousValue === null || previousValue === value) {
      return;
    }

    // Determine direction
    const newDirection = value > previousValue ? 'up' : 'down';
    setDirection(newDirection);
    setShowArrow(true);

    // No haptic here: buzzing on every half-hourly update was too chatty.
    // Band changes still get one (StateTransitionFX).

    // Hide arrow after 2 seconds
    const timer = setTimeout(() => {
      setShowArrow(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [value, previousValue]);

  // Halo pulse when the cleanliness band changes (e.g. green → amber)
  const { transition } = useCleanlinessBand(value);
  const haloColor =
    transition?.direction === 'cleaner'
      ? 'hsl(var(--primary) / 0.55)'
      : transition?.direction === 'dirtier'
      ? 'hsl(var(--destructive) / 0.55)'
      : 'transparent';

  return (
    <div className={cn('relative flex items-center gap-1', className)} aria-live="polite" aria-atomic="true">
      {/* Band-change halo — fires once per transition, ignored under reduced motion */}
      <AnimatePresence>
        {transition && !shouldReduceMotion && (
          <motion.span
            key={`halo-${transition.at}`}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: `radial-gradient(circle, ${haloColor} 0%, transparent 65%)` }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.6, 2] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' as const }}
          />
        )}
      </AnimatePresence>

      <motion.span
        className={cn(
          'font-bold tabular-nums tracking-tighter',
          size === 'hero'
            ? highContrast
              ? 'text-[4.25rem] min-[380px]:text-[5.5rem] sm:text-8xl leading-none text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.65)] [text-shadow:0_2px_0_rgba(0,0,0,0.35),0_8px_24px_rgba(0,0,0,0.45)]'
              : 'text-[4.25rem] min-[380px]:text-[5.5rem] sm:text-8xl leading-none text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]'
            : 'text-6xl text-card drop-shadow-md',
        )}
        key={value}
        initial={
          !shouldReduceMotion && previousValue !== null && previousValue !== value
            ? { scale: 1.15, opacity: 0.7 }
            : false
        }
        animate={{
          scale: !shouldReduceMotion && transition ? [1, 1.08, 1] : 1,
          opacity: !shouldReduceMotion && isUpdating ? [1, 0.55, 1] : 1,
        }}
        transition={{
          scale: transition
            ? { duration: 0.5, ease: 'easeOut' as const }
            : { type: 'spring' as const, stiffness: 380, damping: 18, duration: 0.4 },
          opacity: isUpdating
            ? { repeat: Infinity, duration: 1.6, ease: 'easeInOut' as const }
            : { duration: 0.25 },
        }}
      >
        {displayNumber}
      </motion.span>


      <AnimatePresence>
        {showArrow && direction && (
          <motion.div
            initial={!shouldReduceMotion ? { opacity: 0, x: -5 } : { opacity: 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: !shouldReduceMotion ? 5 : 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center"
          >
            {direction === 'up' ? (
              <TrendingUp className="w-5 h-5 text-destructive drop-shadow-sm" />
            ) : (
              <TrendingDown className="w-5 h-5 text-primary drop-shadow-sm" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
