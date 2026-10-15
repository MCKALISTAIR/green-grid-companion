import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useId } from 'react';

interface ValleyMistProps {
  cleanliness: number;
  timeOfDay?: string;
  isNight?: boolean;
}

export function ValleyMist({ cleanliness, timeOfDay, isNight }: ValleyMistProps) {
  const reduced = useReducedMotion();
  const id = useId();

  // Show mist in dawn, morning, sunset, or dusk. Keep midday and full night clear.
  const isVisible =
    timeOfDay === 'dawn' ||
    timeOfDay === 'morning' ||
    timeOfDay === 'sunset' ||
    timeOfDay === 'dusk';
  if (!isVisible) return null;

  // Tint of mist: cool blue on clean days, warm sepia on dirty days
  const hue = cleanliness > 0.5 ? 200 : 35;
  const sat = cleanliness > 0.5 ? '25%' : '18%';
  const light = isNight ? 25 : 88;
  const mistColor = `hsl(${hue} ${sat} ${light}% / 0.15)`;

  const mistAnimate = reduced ? { x: 0 } : { x: ['-15%', '15%', '-15%'] };

  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 pointer-events-none z-[15] overflow-hidden"
      style={{
        height: '40%', // Positioned exactly at valley height
        transform: 'translateY(5px)', // Flush with hills
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2 }}
    >
      <svg
        viewBox="0 20 400 60"
        className="w-full h-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id={`${id}-mistBlur`}>
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <motion.g
          filter={`url(#${id}-mistBlur)`}
          animate={mistAnimate}
          transition={{
            duration: 38,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          }}
        >
          {/* Valley mist shapes */}
          <path
            d="M -50,38 Q 50,25 150,38 T 350,38 T 450,38 L 450,60 L -50,60 Z"
            fill={mistColor}
          />
          <path
            d="M -80,48 Q 40,38 160,48 T 380,48 T 480,48 L 480,60 L -80,60 Z"
            fill={mistColor}
            opacity={0.85}
          />
        </motion.g>
      </svg>
    </motion.div>
  );
}
