import { motion } from 'framer-motion';

export function SunRay({ angle, delay }: { angle: number; delay: number }) {
  return (
    <motion.div
      className="absolute top-0 right-0 w-2 h-32 bg-gradient-to-b from-accent/40 to-transparent"
      style={{
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'top right',
      }}
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{
        duration: 3,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}
