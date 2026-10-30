import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function SunRay({ angle, delay }: { angle: number; delay: number }) {
  // Reduce Motion: a steady ray instead of a 3s pulse that never stops.
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="absolute top-0 right-0 w-2 h-32 bg-gradient-to-b from-accent/40 to-transparent"
      style={{
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'top right',
      }}
      initial={reduce ? false : undefined}
      animate={reduce ? { opacity: 0.5 } : { opacity: [0.3, 0.7, 0.3] }}
      transition={
        reduce
          ? { duration: 0 }
          : { duration: 3, delay, repeat: Infinity, ease: 'easeInOut' as const }
      }
    />
  );
}
