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

// 🎡 London Eye / Ferris Wheel — grounded with A-frame legs touching the road
export function LondonEye({ x = 60, y = 110, radius = 22, isNight, skipIntro }: {
  x?: number; y?: number; radius?: number; isNight: boolean; skipIntro?: boolean;
}) {
  const podCount = 16;
  const podRadius = 1.8;
  const groundY = 138; // road surface
  const spokeColor = isNight ? 'rgba(180,200,220,0.4)' : 'rgba(120,140,160,0.5)';
  const rimColor = isNight ? 'rgba(180,200,220,0.3)' : 'rgba(120,140,160,0.4)';
  const podFill = isNight ? '#fbbf24' : 'rgba(200,210,220,0.7)';
  const legColor = isNight ? 'rgba(160,180,200,0.55)' : 'rgba(100,120,140,0.7)';

  return (
    <motion.g
      initial={skipIntro ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.5, delay: 0.3 }}
    >
      {/* A-frame support legs from hub down to ground */}
      <line x1={x - 12} y1={groundY} x2={x} y2={y} stroke={legColor} strokeWidth="1.8" strokeLinecap="round" />
      <line x1={x + 12} y1={groundY} x2={x} y2={y} stroke={legColor} strokeWidth="1.8" strokeLinecap="round" />
      {/* Cross-brace */}
      <line x1={x - 6} y1={(groundY + y) / 2} x2={x + 6} y2={(groundY + y) / 2} stroke={legColor} strokeWidth="0.6" />
      {/* Concrete plinth */}
      <rect x={x - 16} y={groundY - 2} width={32} height={3} rx={0.5} fill={isNight ? '#334155' : '#94a3b8'} opacity={0.8} />

      {/* Rotating wheel group */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${x}px ${y}px` }}
      >
        {/* Outer rim */}
        <circle cx={x} cy={y} r={radius} fill="none" stroke={rimColor} strokeWidth="1.2" />
        {/* Inner rim */}
        <circle cx={x} cy={y} r={radius - 2} fill="none" stroke={rimColor} strokeWidth="0.4" />

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
              <ellipse cx={px} cy={py} rx={podRadius} ry={podRadius * 0.7} fill={podFill} opacity={isNight ? 0.9 : 0.75} />
              {isNight && (
                <ellipse cx={px} cy={py} rx={podRadius + 1.2} ry={podRadius} fill="#fbbf24" opacity={0.1} />
              )}
            </g>
          );
        })}
      </motion.g>

      {/* Hub / axle */}
      <circle cx={x} cy={y} r={1.8} fill={isNight ? '#475569' : '#9ca3af'} />
    </motion.g>
  );
}

// 🌫️ Smog band — brownish haze layer behind skyline when grid is dirty
export function SmogBand({ cleanliness }: { cleanliness: number }) {
  if (cleanliness >= 0.5) return null;
  const opacity = Math.min(0.55, (0.5 - cleanliness) * 1.1);
  const gradId = `smog-${Math.round(cleanliness * 100)}`;
  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(30, 25%, 55%)" stopOpacity="0" />
          <stop offset="50%" stopColor="hsl(28, 30%, 50%)" stopOpacity={opacity} />
          <stop offset="100%" stopColor="hsl(25, 35%, 45%)" stopOpacity={opacity * 0.7} />
        </linearGradient>
      </defs>
      <rect x={0} y={55} width={400} height={60} fill={`url(#${gradId})`} />
    </g>
  );
}

// 🏭 Distant stack on the far horizon — only when grid is very dirty
export function DistantStack({ x = 365, isNight }: { x?: number; isNight: boolean }) {
  const stackColor = isNight ? 'rgba(60,70,85,0.7)' : 'rgba(120,130,140,0.6)';
  const baseY = 95;
  return (
    <motion.g
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
    >
      {/* Thin chimney */}
      <rect x={x} y={baseY - 22} width={2} height={22} fill={stackColor} />
      <rect x={x - 1} y={baseY - 24} width={4} height={2} fill={stackColor} />
      {/* Wispy steam plume */}
      <motion.ellipse
        cx={x + 1} cy={baseY - 28}
        rx={3} ry={2}
        fill={isNight ? 'rgba(180,180,180,0.3)' : 'rgba(220,220,220,0.5)'}
        animate={{ cy: [baseY - 28, baseY - 36, baseY - 28], opacity: [0.5, 0.2, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.g>
  );
}

// 🔋 Grid-scale battery storage container (BESS) — status LED tracks cleanliness
export function BatteryStorageContainer({ x = 320, cleanliness, isNight }: {
  x?: number; cleanliness: number; isNight: boolean;
}) {
  const isClean = cleanliness > 0.6;
  const ledColor = isClean ? '#22c55e' : cleanliness > 0.3 ? '#f59e0b' : '#ef4444';
  const bodyColor = isNight ? '#1e293b' : '#475569';
  const groundY = 138;
  const w = 22;
  const h = 8;

  return (
    <motion.g
      aria-hidden="true"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6 }}
    >
      {/* Container body */}
      <rect x={x} y={groundY - h} width={w} height={h} rx={0.5} fill={bodyColor} />
      {/* Corrugation lines */}
      {Array.from({ length: 6 }).map((_, i) => (
        <line
          key={i}
          x1={x + 2 + i * 3} y1={groundY - h + 1}
          x2={x + 2 + i * 3} y2={groundY - 1}
          stroke="rgba(0,0,0,0.2)" strokeWidth="0.3"
        />
      ))}
      {/* Door panel */}
      <rect x={x + w - 6} y={groundY - h + 1.5} width={5} height={h - 2.5} fill="rgba(255,255,255,0.08)" rx={0.3} />
      {/* Status LED */}
      <motion.circle
        cx={x + 2.5} cy={groundY - h + 2}
        r={0.9}
        fill={ledColor}
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: isClean ? 2.5 : 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* "BESS" label */}
      <text x={x + w / 2} y={groundY - 2.5} textAnchor="middle" fontSize="2" fill="rgba(255,255,255,0.5)" fontFamily="monospace">BESS</text>
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
