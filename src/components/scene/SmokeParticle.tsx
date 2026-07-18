import { motion } from 'framer-motion';

export function SmokeParticle({ delay, x }: { delay: number; x: number }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: `${x}%`, bottom: '70px' }}
      initial={{ y: 0, opacity: 0.6, scale: 0.5 }}
      animate={{ y: -60, opacity: 0, scale: 1.5 }}
      transition={{
        duration: 3,
        delay,
        repeat: Infinity,
        ease: 'easeOut' as const,
      }}
    >
      <div className="w-6 h-6 rounded-full bg-secondary/40 blur-sm" />
    </motion.div>
  );
}
