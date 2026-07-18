import { motion } from 'framer-motion';

interface JumpingFishProps {
  x: number;
  y: number;
  delay?: number;
}

export function JumpingFish({ x, y, delay = 0 }: JumpingFishProps) {
  return (
    <motion.g
      initial={{ opacity: 0, x: x - 15, y: y + 4 }}
      animate={{
        opacity: [0, 0.9, 0.9, 0],
        x: [x - 15, x + 5, x + 25],
        y: [y + 4, y - 10, y + 4],
        rotate: [-35, 0, 35],
      }}
      transition={{
        duration: 2.2,
        delay,
        repeat: Infinity,
        repeatDelay: 12 + delay * 1.5,
        ease: 'easeInOut' as const,
      }}
    >
      {/* Breaching dolphin/fish body */}
      <path
        d="M-5,1 Q0,-4 5,-1 Q6,-1 7,-3 Q6,0 4,1 Q0,0 -5,1 Z"
        fill="#38bdf8"
        stroke="#0284c7"
        strokeWidth="0.5"
      />
      {/* Fin */}
      <path d="M-1,-2 L1,-4 L1,-1 Z" fill="#0284c7" />

      {/* Ripple/Splash rings when jumping */}
      <motion.ellipse
        cx={0}
        cy={3}
        rx={5}
        ry={1.2}
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.5"
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.5, 2, 2.5], opacity: [0, 0.7, 0] }}
        transition={{
          duration: 1.4,
          delay: 0.6,
          repeat: Infinity,
          repeatDelay: 12.8 + delay * 1.5,
          ease: 'easeOut' as const,
        }}
      />
    </motion.g>
  );
}
