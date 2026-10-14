import { useEffect, useState } from 'react';
import { useSpring } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  /** Digits after the decimal; 0 rounds to an integer. */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  /**
   * Spring feel — snappier for small % ticks, softer for larger GW swings.
   * Defaults match DemandView's GW readout.
   */
  stiffness?: number;
  damping?: number;
}

function formatFixed(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return decimals > 0 ? (0).toFixed(decimals) : '0';
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
}

/**
 * Counts a number up/down with a spring when `value` changes (e.g. mix refresh).
 * Honours prefers-reduced-motion by snapping immediately.
 */
export function AnimatedNumber({
  value,
  decimals = 1,
  prefix = '',
  suffix = '',
  className,
  stiffness = 160,
  damping = 22,
}: AnimatedNumberProps) {
  const shouldReduceMotion = useReducedMotion();
  const spring = useSpring(value, { stiffness, damping });
  const [display, setDisplay] = useState(() => formatFixed(value, decimals));

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplay(formatFixed(value, decimals));
      return;
    }
    spring.set(value);
  }, [value, spring, shouldReduceMotion, decimals]);

  useEffect(() => {
    if (shouldReduceMotion) return;
    return spring.on('change', (latest) => {
      setDisplay(formatFixed(latest, decimals));
    });
  }, [spring, decimals, shouldReduceMotion]);

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
