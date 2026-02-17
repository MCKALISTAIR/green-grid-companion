import { motion } from 'framer-motion';

export function RainDrop({ delay, x }: { delay: number; x: number }) {
  return (
    <motion.div
      className="absolute w-0.5 h-4 bg-gen-hydro/60 rounded-full"
      style={{ left: `${x}%` }}
      initial={{ y: '-10%', opacity: 0 }}
      animate={{ y: '110%', opacity: [0, 1, 0] }}
      transition={{
        duration: 0.8,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}
