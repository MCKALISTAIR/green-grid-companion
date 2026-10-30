import { motion } from 'framer-motion';

interface FlowersProps {
  positions: { x: number; y: number; color?: string }[]; // SVG coordinates for flower positions
  /** Uniform scale about the stem foot (1 = the original bee-flower size). */
  scale?: number;
}

/** Stem length in flower units: the foot sits this far below the flower head. */
export const FLOWER_STEM = 8;

export function Flowers({ positions, scale = 1 }: FlowersProps) {
  // Flowers for bees to visit
  // Grounded at landscape level

  const flowerColors = ['#ec4899', '#f472b6', '#fb7185', '#fbbf24', '#a855f7'];

  return (
    <g>
      {positions.map((pos, i) => {
        const color = pos.color ?? flowerColors[i % flowerColors.length];

        return (
          <g
            key={i}
            data-flower
            transform={`translate(${pos.x}, ${pos.y})${scale !== 1 ? ` scale(${scale})` : ''}`}
          >
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.2, duration: 0.5 }}
            >
              {/* Stem */}
              <line x1="0" y1="0" x2="0" y2={FLOWER_STEM} stroke="#16a34a" strokeWidth="1" />

              {/* Petals - smaller for better proportions */}
              {[0, 72, 144, 216, 288].map((angle) => (
                <g key={angle} transform={`rotate(${angle})`}>
                  <motion.ellipse
                    cx="0"
                    cy="-2"
                    rx="1.5"
                    ry="2"
                    fill={color}
                    opacity="0.9"
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2 + i * 0.3,
                      repeat: Infinity,
                      ease: 'easeInOut' as const,
                      delay: i * 0.2,
                    }}
                  />
                </g>
              ))}

              {/* Center - smaller */}
              <circle cx="0" cy="0" r="1" fill="#fbbf24" />

              {/* Leaves */}
              <ellipse cx="-2" cy="4" rx="1.5" ry="2" fill="#22c55e" transform="rotate(-45 -2 4)" />
              <ellipse cx="2" cy="4" rx="1.5" ry="2" fill="#22c55e" transform="rotate(45 2 4)" />
            </motion.g>
          </g>
        );
      })}
    </g>
  );
}
