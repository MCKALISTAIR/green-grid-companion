import { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';
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
}

export function AnimatedIntensity({
  value,
  previousValue,
  animationDuration = 500,
  className,
  isUpdating = false,
}: AnimatedIntensityProps) {
  const [showArrow, setShowArrow] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const { impactLight } = useHaptics();
  const shouldReduceMotion = useReducedMotion();
  const hasAnimatedRef = useRef(false);

  // Spring animation for smooth number counting
  const springValue = useSpring(value, {
    damping: 30,
    stiffness: 100,
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

    // Trigger haptic feedback
    impactLight();

    // Hide arrow after 2 seconds
    const timer = setTimeout(() => {
      setShowArrow(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [value, previousValue, impactLight]);

  return (
    <div className={cn('flex items-center gap-1', className)} aria-live="polite" aria-atomic="true">
      <motion.span
        className="text-6xl font-bold text-card drop-shadow-md tabular-nums"
        key={value}
        initial={!shouldReduceMotion && previousValue !== null && previousValue !== value ? { scale: 1.05 } : false}
        animate={{
          scale: 1,
          // Subtle breath while background-fetching — halts immediately on new data
          opacity: !shouldReduceMotion && isUpdating ? [1, 0.55, 1] : 1,
        }}
        transition={{
          scale: { duration: 0.3 },
          opacity: isUpdating
            ? { repeat: Infinity, duration: 1.6, ease: 'easeInOut' }
            : { duration: 0.4 },
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
