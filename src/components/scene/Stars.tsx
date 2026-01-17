import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface StarsProps {
  count?: number;
  visibility?: number; // 0-1, affected by pollution
}

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

export function Stars({ count = 30, visibility = 1 }: StarsProps) {
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 50, // Only in top half
      size: Math.random() * 2 + 1,
      delay: Math.random() * 3,
      duration: 1.5 + Math.random() * 2,
    }));
  }, [count]);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: visibility }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
    >
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-card"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.div>
  );
}
