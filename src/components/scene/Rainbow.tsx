import { motion } from 'framer-motion';
import { useId } from 'react';

export function Rainbow() {
  const id = useId();
  // Grounded at Y=40 (sky layer) - arcs across scene

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 1.5, ease: 'easeOut' as const }}
    >
      <svg
        className="absolute top-0 left-0 w-full h-full"
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          {/* Rainbow gradient with proper colors */}
          <linearGradient id={`${id}-rainbowGrad`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.7" /> {/* Red */}
            <stop offset="16.6%" stopColor="#f97316" stopOpacity="0.7" /> {/* Orange */}
            <stop offset="33.3%" stopColor="#fbbf24" stopOpacity="0.7" /> {/* Yellow */}
            <stop offset="50%" stopColor="#22c55e" stopOpacity="0.7" /> {/* Green */}
            <stop offset="66.6%" stopColor="#3b82f6" stopOpacity="0.7" /> {/* Blue */}
            <stop offset="83.3%" stopColor="#6366f1" stopOpacity="0.7" /> {/* Indigo */}
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.7" /> {/* Violet */}
          </linearGradient>
        </defs>

        {/* Rainbow arc - each band slightly larger */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const arcPath = `M -20,120 Q 200,${40 - i * 5} 420,120`;

          return (
            <motion.path
              key={i}
              d={arcPath}
              stroke={`url(#${id}-rainbowGrad)`}
              strokeWidth="6"
              fill="none"
              opacity={0.6 - i * 0.05}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 - i * 0.05 }}
              transition={{
                pathLength: { duration: 2, delay: i * 0.1, ease: 'easeOut' as const },
                opacity: { duration: 0.5, delay: i * 0.1 },
              }}
            />
          );
        })}

        {/* Sparkle effects at rainbow ends */}
        {[20, 380].map((x, idx) => (
          <motion.g key={idx}>
            {[0, 1, 2].map((i) => (
              <motion.circle
                key={i}
                cx={x}
                cy={115 + i * 5}
                r="2"
                fill="white"
                opacity="0.8"
                animate={{
                  opacity: [0, 0.8, 0],
                  scale: [0.5, 1.2, 0.5],
                }}
                transition={{
                  duration: 2,
                  delay: idx * 0.5 + i * 0.3,
                  repeat: Infinity,
                  ease: 'easeInOut' as const,
                }}
              />
            ))}
          </motion.g>
        ))}
      </svg>
    </motion.div>
  );
}
