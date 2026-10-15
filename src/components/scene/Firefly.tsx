import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function Firefly({ delay, x, y }: { delay: number; x: number; y: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="absolute w-1 h-1 bg-yellow-400 rounded-full shadow-[0_0_8px_2px_rgba(250,204,21,0.6)]"
      style={{ left: `${x}%`, bottom: `${y}%` }}
      animate={
        reduced
          ? { opacity: 0.7 }
          : {
              opacity: [0, 1, 0.5, 1, 0],
              scale: [0.8, 1.2, 0.8],
              x: [0, 10, -10, 0],
              y: [0, -15, 0],
            }
      }
      transition={
        reduced
          ? { duration: 0 }
          : {
              duration: 4,
              delay,
              repeat: Infinity,
              ease: 'easeInOut' as const,
            }
      }
    />
  );
}
