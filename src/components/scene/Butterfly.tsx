import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ButterflyProps {
  startX: number;
  delay?: number;
}

export function Butterfly({ startX, delay = 0 }: ButterflyProps) {
  // Reduce Motion: no butterflies. They only exist as an endless flight path and wing flap.
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <motion.svg
      className="absolute w-6 h-6"
      data-ambient="butterfly"
      viewBox="0 0 24 24"
      aria-hidden="true"
      initial={{ x: `${startX}%`, y: '60%', opacity: 0 }}
      animate={{
        x: [`${startX}%`, `${startX + 30}%`, `${startX + 15}%`, `${startX + 40}%`],
        y: ['60%', '40%', '50%', '35%'],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      }}
    >
      {/* Left wing */}
      <motion.g
        animate={{ scaleX: [1, 0.35, 1] }}
        transition={{
          duration: 0.3,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        }}
        style={{ transformOrigin: '9px 12px' }}
      >
        <ellipse cx="9" cy="12" rx="6" ry="4" className="fill-primary/70" />
      </motion.g>
      {/* Right wing */}
      <motion.g
        animate={{ scaleX: [1, 0.35, 1] }}
        transition={{
          duration: 0.3,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        }}
        style={{ transformOrigin: '15px 12px' }}
      >
        <ellipse cx="15" cy="12" rx="6" ry="4" className="fill-primary/60" />
      </motion.g>
      {/* Body */}
      <ellipse cx="12" cy="12" rx="1" ry="5" className="fill-foreground/60" />
    </motion.svg>
  );
}
