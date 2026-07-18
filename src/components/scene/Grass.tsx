import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface GrassProps {
  cleanliness: number;
  windSpeed?: number;
}

interface GrassBlade {
  id: number;
  x: number;
  height: number;
  delay: number;
}

export function Grass({ cleanliness, windSpeed = 1 }: GrassProps) {
  const blades = useMemo<GrassBlade[]>(() => {
    const count = Math.floor(cleanliness * 20) + 5; // More grass when clean
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (i / count) * 100,
      height: 8 + Math.random() * 8,
      delay: Math.random() * 0.5,
    }));
  }, [cleanliness]);

  const grassColor = cleanliness > 0.5 
    ? 'hsl(142 50% 40%)' // Healthy green
    : 'hsl(45 40% 45%)'; // Yellow/brown

  return (
    <div className="absolute bottom-0 left-0 right-0 h-6 overflow-hidden pointer-events-none">
      <svg
        viewBox="0 0 100 12"
        className="w-full h-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {blades.map((blade) => (
          <motion.path
            key={blade.id}
            d={`M${blade.x},12 Q${blade.x + 0.3},${12 - blade.height * 0.7} ${blade.x + 0.5},${12 - blade.height}`}
            stroke={grassColor}
            strokeWidth="0.4"
            fill="none"
            strokeLinecap="round"
            animate={{
              d: [
                `M${blade.x},12 Q${blade.x + 0.3},${12 - blade.height * 0.7} ${blade.x + 0.5},${12 - blade.height}`,
                `M${blade.x},12 Q${blade.x + 0.8},${12 - blade.height * 0.7} ${blade.x + 1.2},${12 - blade.height}`,
                `M${blade.x},12 Q${blade.x + 0.3},${12 - blade.height * 0.7} ${blade.x + 0.5},${12 - blade.height}`,
              ],
            }}
            transition={{
              duration: 2 / windSpeed,
              delay: blade.delay,
              repeat: Infinity,
              ease: 'easeInOut' as const,
            }}
          />
        ))}
      </svg>
    </div>
  );
}
