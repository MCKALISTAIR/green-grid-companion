import { useMemo } from 'react';
import { motion } from 'framer-motion';

// 🐦 Seagull — soaring flight pattern
export function Seagull({ startX = 50, startY = 25, delay = 0, scale = 1 }: {
  startX?: number; startY?: number; delay?: number; scale?: number;
}) {
  return (
    <motion.g
      initial={{ x: startX, y: startY, opacity: 0 }}
      animate={{
        x: [startX, startX + 80, startX + 160, startX + 250],
        y: [startY, startY - 8, startY + 5, startY - 3],
        opacity: [0, 1, 1, 0],
      }}
      transition={{ duration: 14, delay, repeat: Infinity, repeatDelay: delay + 6, ease: 'linear' }}
    >
      <g transform={`scale(${scale})`}>
        {/* Wing flap animation */}
        <motion.path
          d="M0,0 L-6,-3 L-10,0"
          stroke="#e2e8f0"
          strokeWidth="1.2"
          fill="none"
          animate={{ d: [
            "M0,0 L-6,-3 L-10,0",
            "M0,0 L-6,-1 L-10,1",
            "M0,0 L-6,-3 L-10,0",
          ] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.path
          d="M0,0 L6,-3 L10,0"
          stroke="#e2e8f0"
          strokeWidth="1.2"
          fill="none"
          animate={{ d: [
            "M0,0 L6,-3 L10,0",
            "M0,0 L6,-1 L10,1",
            "M0,0 L6,-3 L10,0",
          ] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Body */}
        <ellipse cx={0} cy={0} rx={2} ry={1} fill="#f1f5f9" />
      </g>
    </motion.g>
  );
}

// ⛵ Sailing boat
export function SailingBoat({ x = 150, delay = 0, isNight = false }: {
  x?: number; delay?: number; isNight?: boolean;
}) {
  const hullColor = isNight ? '#334155' : '#7c3aed';
  const sailColor = isNight ? '#94a3b8' : '#f1f5f9';

  return (
    <motion.g
      initial={{ x: x - 50, opacity: 0 }}
      animate={{ x: [x - 50, x + 100], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 25, delay, repeat: Infinity, repeatDelay: delay + 10, ease: 'linear' }}
    >
      {/* Gentle bobbing */}
      <motion.g
        animate={{ y: [0, -1.5, 0, 1, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Hull */}
        <path d="M-8,95 L-6,92 L10,92 L8,95 Z" fill={hullColor} />
        {/* Mast */}
        <line x1={2} y1={92} x2={2} y2={78} stroke="#6b7280" strokeWidth="0.8" />
        {/* Sail */}
        <polygon points="3,80 3,91 12,91" fill={sailColor} opacity={0.85} />
        {/* Small flag */}
        <polygon points="2,78 2,80 5,79" fill="#ef4444" opacity={0.7} />
      </motion.g>
    </motion.g>
  );
}

// 🚢 Fishing boat (larger, more detailed)
export function FishingBoat({ x = 250, delay = 0, isNight = false }: {
  x?: number; delay?: number; isNight?: boolean;
}) {
  const hullColor = isNight ? '#1e293b' : '#1e40af';
  const cabinColor = isNight ? '#334155' : '#f1f5f9';

  return (
    <motion.g
      initial={{ x: x }}
      animate={{ x: [x, x + 40, x] }}
      transition={{ duration: 30, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.g
        animate={{ y: [0, -2, 0, 1.5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Hull */}
        <path d="M-12,97 L-10,93 L14,93 L12,97 Z" fill={hullColor} />
        {/* Cabin */}
        <rect x={-4} y={89} width={10} height={4} rx={1} fill={cabinColor} />
        {/* Cabin window */}
        <rect x={-1} y={90} width={3} height={2} rx={0.5} fill={isNight ? '#fbbf24' : '#93c5fd'} opacity={isNight ? 0.7 : 0.5} />
        {/* Mast */}
        <line x1={3} y1={89} x2={3} y2={82} stroke="#6b7280" strokeWidth="0.6" />
        {/* Rigging */}
        <line x1={-10} y1={93} x2={3} y2={82} stroke="#9ca3af" strokeWidth="0.3" opacity={0.5} />
        <line x1={14} y1={93} x2={3} y2={82} stroke="#9ca3af" strokeWidth="0.3" opacity={0.5} />
        {/* Navigation light at night */}
        {isNight && (
          <motion.circle cx={3} cy={82} r={1} fill="#22c55e" opacity={0.7}
            animate={{ opacity: [0.7, 0.3, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.g>
    </motion.g>
  );
}

// 🌊 Coastal offshore wind turbines (closer, bigger than existing OffshoreWind)
export function CoastalOffshoreWind({ count = 3, windSpeed = 10 }: {
  count?: number; windSpeed?: number;
}) {
  const rotationSpeed = Math.max(4, 10 - (windSpeed / 4));

  return (
    <g>
      {Array.from({ length: count }).map((_, i) => {
        const x = 100 + i * 55;
        const scale = 0.5 - i * 0.08;
        const opacity = 0.7 - i * 0.1;

        return (
          <g key={i} transform={`translate(${x}, 82) scale(${scale})`} opacity={opacity}>
            {/* Base in water */}
            <rect x={-2} y={-5} width={4} height={5} fill="#64748b" opacity={0.5} />
            {/* Tower */}
            <line x1={0} y1={-5} x2={0} y2={-40} stroke="#94a3b8" strokeWidth="2.5" />
            {/* Nacelle */}
            <rect x={-3} y={-42} width={6} height={3} rx={1} fill="#cbd5e1" />
            {/* Rotating blades */}
            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`${i * 40} 0 -40`}
                to={`${360 + i * 40} 0 -40`}
                dur={`${rotationSpeed + i}s`}
                repeatCount="indefinite"
              />
              {[0, 120, 240].map(angle => (
                <line
                  key={angle}
                  x1={0} y1={-40}
                  x2={0} y2={-60}
                  stroke="#e2e8f0"
                  strokeWidth="1.5"
                  opacity={0.7}
                  transform={`rotate(${angle} 0 -40)`}
                />
              ))}
            </g>
          </g>
        );
      })}
    </g>
  );
}

// Collection: Seagull flock
export function SeagullFlock({ count = 4, isNight = false }: { count?: number; isNight?: boolean }) {
  const gulls = useMemo(() =>
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      startX: -20 + i * 15,
      startY: 15 + (i % 3) * 8,
      delay: i * 3,
      scale: 0.7 + Math.random() * 0.4,
    })), [count]);

  if (isNight) return null;

  return (
    <g>
      {gulls.map(g => (
        <Seagull key={g.id} {...g} />
      ))}
    </g>
  );
}
