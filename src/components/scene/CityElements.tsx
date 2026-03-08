import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 🚗 Car/Vehicle on the road
export function CityVehicle({ direction = 'right', isEV = false, delay = 0, speed = 12 }: {
  direction?: 'left' | 'right';
  isEV?: boolean;
  delay?: number;
  speed?: number;
}) {
  const y = direction === 'right' ? 141 : 145;
  const startX = direction === 'right' ? -20 : 420;
  const endX = direction === 'right' ? 420 : -20;

  return (
    <motion.g
      initial={{ x: startX }}
      animate={{ x: endX }}
      transition={{ duration: speed, delay, repeat: Infinity, repeatDelay: delay + 3, ease: 'linear' }}
    >
      {/* Car body */}
      <rect x={0} y={y} width={14} height={5} rx={1.5} fill={isEV ? '#22d3ee' : '#6b7280'} />
      {/* Roof */}
      <rect x={3} y={y - 3} width={8} height={3} rx={1} fill={isEV ? '#06b6d4' : '#4b5563'} />
      {/* Wheels */}
      <circle cx={3} cy={y + 5} r={1.5} fill="#1f2937" />
      <circle cx={11} cy={y + 5} r={1.5} fill="#1f2937" />
      {/* EV indicator - small green glow */}
      {isEV && (
        <circle cx={7} cy={y + 2} r={0.8} fill="#22c55e" opacity={0.8} />
      )}
      {/* Exhaust for non-EV */}
      {!isEV && (
        <motion.circle
          cx={direction === 'right' ? -2 : 16}
          cy={y + 3}
          r={1}
          fill="rgba(150,150,150,0.4)"
          animate={{ r: [1, 2.5, 0], opacity: [0.4, 0.2, 0], y: [0, -3, -6] }}
          transition={{ duration: 2, repeat: Infinity, delay: delay + 0.5 }}
        />
      )}
    </motion.g>
  );
}

// 🚌 Bus
export function CityBus({ direction = 'right', isElectric = false, delay = 0 }: {
  direction?: 'left' | 'right';
  isElectric?: boolean;
  delay?: number;
}) {
  const y = direction === 'right' ? 139 : 143;
  const startX = direction === 'right' ? -30 : 430;
  const endX = direction === 'right' ? 430 : -30;

  return (
    <motion.g
      initial={{ x: startX }}
      animate={{ x: endX }}
      transition={{ duration: 18, delay, repeat: Infinity, repeatDelay: delay + 8, ease: 'linear' }}
    >
      {/* Bus body */}
      <rect x={0} y={y} width={24} height={8} rx={1.5} fill={isElectric ? '#0ea5e9' : '#dc2626'} />
      {/* Windows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <rect key={i} x={2 + i * 5.5} y={y + 1} width={4} height={4} rx={0.5} fill="rgba(200,230,255,0.6)" />
      ))}
      {/* Wheels */}
      <circle cx={5} cy={y + 8} r={2} fill="#1f2937" />
      <circle cx={19} cy={y + 8} r={2} fill="#1f2937" />
    </motion.g>
  );
}

// 🐦 Pigeon
export function Pigeon({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      <motion.g
        animate={{
          x: [x, x + 3, x - 2, x + 1, x],
          y: [y, y, y, y, y],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Body */}
        <ellipse cx={0} cy={0} rx={3} ry={2} fill="#9ca3af" />
        {/* Head */}
        <circle cx={3} cy={-1} r={1.5} fill="#6b7280" />
        {/* Beak */}
        <polygon points="4.5,-1 5.5,-0.5 4.5,-0.5" fill="#f59e0b" />
        {/* Eye */}
        <circle cx={3.5} cy={-1.3} r={0.3} fill="#ef4444" />
        {/* Pecking animation */}
        <motion.g
          animate={{ rotate: [0, 15, 0, 0, 0, 15, 0] }}
          transition={{ duration: 4, repeat: Infinity, delay: delay * 0.7 }}
          style={{ transformOrigin: '3px -1px' }}
        >
          <circle cx={3} cy={-1} r={1.5} fill="#6b7280" />
          <polygon points="4.5,-1 5.5,-0.5 4.5,-0.5" fill="#f59e0b" />
          <circle cx={3.5} cy={-1.3} r={0.3} fill="#ef4444" />
        </motion.g>
      </motion.g>
    </motion.g>
  );
}

// 🏗️ Construction crane (for high-carbon / building phase)
export function ConstructionCrane({ x = 350, isNight }: { x?: number; isNight: boolean }) {
  const color = isNight ? '#475569' : '#f59e0b';
  return (
    <g>
      {/* Vertical mast */}
      <rect x={x} y={30} width={3} height={120} fill={color} opacity={0.7} />
      {/* Horizontal jib */}
      <rect x={x - 30} y={30} width={60} height={2} fill={color} opacity={0.7} />
      {/* Counter-jib */}
      <rect x={x + 3} y={30} width={20} height={2} fill={color} opacity={0.6} />
      {/* Cable */}
      <line x1={x + 1.5} y1={30} x2={x - 20} y2={32} stroke={color} strokeWidth={0.5} opacity={0.5} />
      {/* Hook cable */}
      <motion.line
        x1={x - 15} y1={32}
        x2={x - 15} y2={80}
        stroke={color}
        strokeWidth={0.5}
        opacity={0.5}
        animate={{ y2: [80, 70, 80] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Warning light at top */}
      {isNight && (
        <motion.circle
          cx={x + 1.5} cy={28}
          r={1.5}
          fill="#ef4444"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </g>
  );
}

// 🎡 London Eye / Ferris Wheel
export function LondonEye({ x = 42, y = 50, radius = 28, isNight, skipIntro }: {
  x?: number; y?: number; radius?: number; isNight: boolean; skipIntro?: boolean;
}) {
  const podCount = 16;
  const podRadius = 2.2;
  const spokeColor = isNight ? 'rgba(180,200,220,0.35)' : 'rgba(120,140,160,0.45)';
  const rimColor = isNight ? 'rgba(180,200,220,0.25)' : 'rgba(120,140,160,0.35)';
  const podFill = isNight ? '#fbbf24' : 'rgba(200,210,220,0.6)';
  const podGlow = isNight ? 0.7 : 0;

  return (
    <motion.g
      initial={skipIntro ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.5, delay: 0.3 }}
    >
      {/* Support structure – A-frame legs */}
      <line x1={x - 6} y1={y + radius + 12} x2={x} y2={y} stroke={spokeColor} strokeWidth="1.5" />
      <line x1={x + 6} y1={y + radius + 12} x2={x} y2={y} stroke={spokeColor} strokeWidth="1.5" />
      {/* Cross-brace */}
      <line x1={x - 3} y1={y + radius * 0.6} x2={x + 3} y2={y + radius * 0.6} stroke={spokeColor} strokeWidth="0.6" />

      {/* Rotating wheel group */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${x}px ${y}px` }}
      >
        {/* Outer rim */}
        <circle cx={x} cy={y} r={radius} fill="none" stroke={rimColor} strokeWidth="1.2" />
        {/* Inner rim */}
        <circle cx={x} cy={y} r={radius - 2.5} fill="none" stroke={rimColor} strokeWidth="0.4" />

        {/* Spokes */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <line
              key={`spoke-${i}`}
              x1={x} y1={y}
              x2={x + Math.cos(angle) * (radius - 1)}
              y2={y + Math.sin(angle) * (radius - 1)}
              stroke={spokeColor}
              strokeWidth="0.4"
            />
          );
        })}

        {/* Pods */}
        {Array.from({ length: podCount }).map((_, i) => {
          const angle = (i / podCount) * Math.PI * 2;
          const px = x + Math.cos(angle) * radius;
          const py = y + Math.sin(angle) * radius;
          return (
            <g key={`pod-${i}`}>
              {/* Pod capsule */}
              <ellipse cx={px} cy={py} rx={podRadius} ry={podRadius * 0.7} fill={podFill} opacity={isNight ? 0.9 : 0.7} />
              {/* Night glow */}
              {isNight && (
                <ellipse cx={px} cy={py} rx={podRadius + 1.5} ry={podRadius} fill="#fbbf24" opacity={podGlow * 0.12} />
              )}
            </g>
          );
        })}
      </motion.g>

      {/* Hub / axle */}
      <circle cx={x} cy={y} r={2} fill={isNight ? '#475569' : '#9ca3af'} />
    </motion.g>
  );
}

// City traffic - collection of vehicles responding to intensity
export function CityTraffic({ cleanliness, isNight }: { cleanliness: number; isNight: boolean }) {
  // More EVs when cleaner
  const evRatio = cleanliness;
  
  const vehicles = useMemo(() => {
    const count = isNight ? 3 : 5;
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      direction: (i % 2 === 0 ? 'right' : 'left') as 'left' | 'right',
      isEV: Math.random() < evRatio,
      delay: i * 4,
      speed: 10 + Math.random() * 8,
    }));
  }, [isNight, evRatio > 0.5]); // Only recalculate when crossing threshold

  return (
    <g>
      {vehicles.map(v => (
        <CityVehicle key={v.id} {...v} />
      ))}
      {/* One bus */}
      <CityBus direction="right" isElectric={cleanliness > 0.6} delay={5} />
    </g>
  );
}
