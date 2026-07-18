import { motion } from 'framer-motion';

interface ButterflyProps {
  startX: number;
  delay?: number;
}

export function Butterfly({ startX, delay = 0 }: ButterflyProps) {
  return (
    <motion.svg
      className="absolute w-6 h-6"
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
      <motion.ellipse
        cx="9"
        cy="12"
        rx="6"
        ry="4"
        className="fill-primary/70"
        animate={{ rx: [6, 2, 6] }}
        transition={{
          duration: 0.3,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        }}
      />
      {/* Right wing */}
      <motion.ellipse
        cx="15"
        cy="12"
        rx="6"
        ry="4"
        className="fill-primary/60"
        animate={{ rx: [6, 2, 6] }}
        transition={{
          duration: 0.3,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        }}
      />
      {/* Body */}
      <ellipse cx="12" cy="12" rx="1" ry="5" className="fill-foreground/60" />
    </motion.svg>
  );
}
