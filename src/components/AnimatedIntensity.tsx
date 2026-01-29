import { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useHaptics, ImpactStyle } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

interface AnimatedIntensityProps {
  value: number;
  previousValue: number | null;
  animationDuration?: number;
  className?: string;
}

export function AnimatedIntensity({
  value,
  previousValue,
  animationDuration = 500,
  className,
}: AnimatedIntensityProps) {
  const [showArrow, setShowArrow] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const { lightTap } = useHaptics();
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
    const unsubscribe = displayValue.on('change', (latest) => {
      setDisplayNumber(latest);
    });
    return unsubscribe;
  }, [displayValue]);
  
  // Update spring target when value changes
  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);
  
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
    lightTap();
    
    // Hide arrow after 2 seconds
    const timer = setTimeout(() => {
      setShowArrow(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [value, previousValue, lightTap]);
  
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <motion.span
        className="text-6xl font-bold text-card drop-shadow-md tabular-nums"
        key={value}
        initial={previousValue !== null && previousValue !== value ? { scale: 1.05 } : false}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {displayNumber}
      </motion.span>
      
      <AnimatePresence>
        {showArrow && direction && (
          <motion.div
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 5 }}
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
