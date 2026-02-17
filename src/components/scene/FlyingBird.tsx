import { motion } from 'framer-motion';

export function FlyingBird({ delay, duration, startX, top, scale }: { delay: number; duration: number; startX: number; top: number; scale: number }) {
  return (
    <motion.svg
      className="absolute w-8 h-8"
      initial={{ left: `${startX}%`, opacity: 0 }}
      animate={{
        left: ['${startX}%', '120%'],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{
        top: `${top}%`,
        transform: `scale(${scale})` // Use transform style for scaling to avoid conflicting with framer-motion props if any
      }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <motion.path
        d="M2 12 C6 8, 10 10, 12 12 C14 10, 18 8, 22 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-foreground/60"
        animate={{
          d: [
            "M2 12 C6 8, 10 10, 12 12 C14 10, 18 8, 22 12",
            "M2 12 C6 14, 10 12, 12 12 C14 12, 18 14, 22 12",
            "M2 12 C6 8, 10 10, 12 12 C14 10, 18 8, 22 12",
          ],
        }}
        transition={{
          duration: 0.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.svg>
  );
}
