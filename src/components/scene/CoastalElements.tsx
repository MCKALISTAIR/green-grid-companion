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
      transition={{ duration: 14, delay, repeat: Infinity, repeatDelay: delay + 6, ease: 'linear' as const }}
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
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' as const }}
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
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' as const }}
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
  const hullColor = isNight ? '#334155' : '#1e3a5f';
  const sailColor = isNight ? '#94a3b8' : '#f1f5f9';

  return (
    <motion.g
      initial={{ x: x - 50, opacity: 0 }}
      animate={{ x: [x - 50, x + 100], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 25, delay, repeat: Infinity, repeatDelay: delay + 10, ease: 'linear' as const }}
    >
      {/* Gentle bobbing */}
      <motion.g
        animate={{ y: [0, -1.5, 0, 1, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
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
      transition={{ duration: 30, delay, repeat: Infinity, ease: 'easeInOut' as const }}
    >
      <motion.g
        animate={{ y: [0, -2, 0, 1.5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' as const }}
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

// 🪨 Rock pool with water and starfish/anemones
export function RockPool({ x = 260, y = 116, isNight = false }: {
  x?: number; y?: number; isNight?: boolean;
}) {
  const rockColor = isNight ? '#334155' : '#78716c';
  const poolColor = isNight ? '#1e3a5f' : '#7dd3fc';
  const accentColor = isNight ? '#94a3b8' : '#a8a29e';

  return (
    <g>
      {/* Outer rocks */}
      <ellipse cx={x} cy={y} rx={12} ry={5} fill={rockColor} />
      <ellipse cx={x - 8} cy={y - 1} rx={4} ry={3} fill={accentColor} opacity={0.6} />
      <ellipse cx={x + 7} cy={y - 1} rx={3} ry={2.5} fill={accentColor} opacity={0.5} />
      {/* Pool water */}
      <motion.ellipse
        cx={x} cy={y - 0.5} rx={8} ry={3}
        fill={poolColor} opacity={0.6}
        animate={{ rx: [8, 8.3, 8], ry: [3, 3.2, 3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const }}
      />
      {/* Starfish */}
      <g transform={`translate(${x - 3}, ${y - 1}) scale(0.4)`}>
        <motion.g animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 8, repeat: Infinity }}>
          {[0, 72, 144, 216, 288].map(angle => (
            <line key={angle} x1={0} y1={0} x2={0} y2={-4} stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"
              transform={`rotate(${angle})`} />
          ))}
        </motion.g>
      </g>
      {/* Anemone */}
      <g transform={`translate(${x + 4}, ${y - 1})`}>
        {[-2, -1, 0, 1, 2].map(i => (
          <motion.line key={i} x1={i * 0.8} y1={0} x2={i * 1.2} y2={-2.5}
            stroke="#c084fc" strokeWidth="0.6" strokeLinecap="round"
            animate={{ x2: [i * 1.2, i * 1.5, i * 1.2] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </g>
      {/* Seaweed strand */}
      <motion.path
        d={`M${x + 9},${y} Q${x + 11},${y - 3} ${x + 10},${y - 5}`}
        stroke="#22c55e" strokeWidth="0.8" fill="none" opacity={0.5}
        animate={{ d: [
          `M${x + 9},${y} Q${x + 11},${y - 3} ${x + 10},${y - 5}`,
          `M${x + 9},${y} Q${x + 12},${y - 2} ${x + 11},${y - 5}`,
          `M${x + 9},${y} Q${x + 11},${y - 3} ${x + 10},${y - 5}`,
        ] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
      />
    </g>
  );
}

// 🦀 Crab — scuttles sideways
export function Crab({ x = 280, y = 118, delay = 0 }: {
  x?: number; y?: number; delay?: number;
}) {
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, x: [x, x + 8, x + 12, x + 8, x] }}
      transition={{ duration: 6, delay, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' as const }}
    >
      <motion.g
        animate={{ y: [y, y - 0.5, y] }}
        transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut' as const }}
      >
        {/* Body */}
        <ellipse cx={0} cy={0} rx={3} ry={2} fill="#dc2626" />
        {/* Eyes */}
        <circle cx={-1.5} cy={-2} r={0.6} fill="#1f2937" />
        <circle cx={1.5} cy={-2} r={0.6} fill="#1f2937" />
        <line x1={-1.5} y1={-2} x2={-1.8} y2={-3} stroke="#dc2626" strokeWidth="0.4" />
        <line x1={1.5} y1={-2} x2={1.8} y2={-3} stroke="#dc2626" strokeWidth="0.4" />
        {/* Claws */}
        <motion.g animate={{ rotate: [0, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <path d="M-3,0 L-5,-1 L-6,0.5 L-5,0" fill="#ef4444" />
        </motion.g>
        <motion.g animate={{ rotate: [0, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}>
          <path d="M3,0 L5,-1 L6,0.5 L5,0" fill="#ef4444" />
        </motion.g>
        {/* Legs */}
        {[-1, 0, 1].map(i => (
          <g key={i}>
            <line x1={-2.5} y1={i * 1} x2={-4} y2={i * 1 + 1} stroke="#dc2626" strokeWidth="0.3" />
            <line x1={2.5} y1={i * 1} x2={4} y2={i * 1 + 1} stroke="#dc2626" strokeWidth="0.3" />
          </g>
        ))}
      </motion.g>
    </motion.g>
  );
}

// 🦭 Harbour seal — pops up from the water, looks around, dives back
export function HarbourSeal({ x = 170, y = 96, delay = 0 }: {
  x?: number; y?: number; delay?: number;
}) {
  return (
    <motion.g
      initial={{ y: y + 8, opacity: 0 }}
      animate={{
        y: [y + 8, y, y - 1, y, y + 8],
        opacity: [0, 1, 1, 1, 0],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        repeatDelay: 12 + delay,
        times: [0, 0.15, 0.5, 0.85, 1],
        ease: 'easeInOut' as const,
      }}
    >
      {/* Water splash ring */}
      <motion.ellipse
        cx={x} cy={y + 4} rx={6} ry={1.5}
        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"
        animate={{ rx: [4, 8, 4], opacity: [0.4, 0.1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      {/* Body (partially submerged) */}
      <ellipse cx={x} cy={y + 3} rx={5} ry={3} fill="#6b7280" />
      {/* Head */}
      <circle cx={x} cy={y} r={3.5} fill="#78716c" />
      {/* Lighter belly/chin */}
      <ellipse cx={x} cy={y + 1} rx={2.5} ry={1.5} fill="#a8a29e" opacity={0.5} />
      {/* Eyes — blink */}
      <motion.g
        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
        transition={{ duration: 4, repeat: Infinity, times: [0, 0.7, 0.75, 0.8, 1] }}
        style={{ transformOrigin: `${x}px ${y - 1}px` }}
      >
        <circle cx={x - 1.5} cy={y - 1} r={0.7} fill="#1f2937" />
        <circle cx={x + 1.5} cy={y - 1} r={0.7} fill="#1f2937" />
        {/* Eye shine */}
        <circle cx={x - 1.2} cy={y - 1.3} r={0.25} fill="#f1f5f9" />
        <circle cx={x + 1.8} cy={y - 1.3} r={0.25} fill="#f1f5f9" />
      </motion.g>
      {/* Nose */}
      <ellipse cx={x} cy={y + 0.5} rx={1} ry={0.6} fill="#57534e" />
      {/* Whiskers */}
      {[-1, 1].map(side => (
        <g key={side}>
          <line x1={x + side * 1.5} y1={y + 0.3} x2={x + side * 5} y2={y - 0.5} stroke="#9ca3af" strokeWidth="0.25" />
          <line x1={x + side * 1.5} y1={y + 0.7} x2={x + side * 5} y2={y + 0.8} stroke="#9ca3af" strokeWidth="0.25" />
        </g>
      ))}
      {/* Head turn animation */}
      <motion.g
        animate={{ x: [0, -1, 0, 1, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' as const }}
      />
    </motion.g>
  );
}

// Collection: Rock pools group
export function RockPoolGroup({ cleanliness, isNight }: { cleanliness: number; isNight: boolean }) {
  if (cleanliness < 0.5) return null;

  return (
    <g>
      <RockPool x={250} y={116} isNight={isNight} />
      {cleanliness > 0.7 && <RockPool x={300} y={118} isNight={isNight} />}
      {cleanliness > 0.8 && <RockPool x={340} y={115} isNight={isNight} />}
      <Crab x={260} y={117} delay={2} />
      {cleanliness > 0.7 && <Crab x={315} y={119} delay={6} />}
    </g>
  );
}

// Collection: Seagull flock
export function SeagullFlock({ count = 4, isNight = false }: { count?: number; isNight?: boolean }) {
  const gulls = useMemo(() =>
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      startX: 20 + i * 70 + Math.random() * 20,
      startY: 18 + Math.random() * 25,
      delay: i * 2.5 + Math.random(),
      scale: 0.7 + Math.random() * 0.4,
    })), [count]);

  if (isNight) return null;

  return (
    <g>
      {gulls.map((g) => (
        <Seagull key={g.id} startX={g.startX} startY={g.startY} delay={g.delay} scale={g.scale} />
      ))}
    </g>
  );
}

/** Horizon pollution for dirty coastal — distant stack + oil sheen (silhouette test). */
export function CoastalHorizonPollution({ cleanliness, isNight }: { cleanliness: number; isNight: boolean }) {
  if (cleanliness >= 0.45) return null;
  const intensity = Math.min(1, (0.45 - cleanliness) / 0.45);
  const stackColor = isNight ? 'rgba(210,190,150,0.9)' : 'rgba(55,45,35,0.92)';
  const sheenA = isNight ? 'rgba(80,60,20,0.45)' : 'rgba(40,90,50,0.35)';
  const sheenB = isNight ? 'rgba(100,40,20,0.3)' : 'rgba(90,40,20,0.28)';

  return (
    <g aria-hidden="true">
      {/* Ochre horizon haze — painted above the sea fill */}
      <rect
        x={0} y={68} width={400} height={22}
        fill={`rgba(${isNight ? '90,55,25' : '160,110,45'},${0.22 + intensity * 0.4})`}
      />
      {/* Distant industrial stacks — sit over open water, not under the right beach/cliff */}
      <g opacity={0.8 + intensity * 0.2}>
        <rect x={218} y={68} width={4} height={24} fill={stackColor} />
        <rect x={216} y={66} width={8} height={3} fill={stackColor} />
        <motion.ellipse
          cx={221} cy={62}
          rx={6} ry={3.5}
          fill={isNight ? 'rgba(180,180,180,0.4)' : 'rgba(120,120,120,0.55)'}
          animate={{ cy: [62, 54, 62], opacity: [0.55, 0.25, 0.55] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' as const }}
        />
        {cleanliness < 0.25 && (
          <>
            <rect x={232} y={74} width={3.5} height={18} fill={stackColor} />
            <rect x={230} y={72} width={7.5} height={2.5} fill={stackColor} />
            <motion.ellipse
              cx={234} cy={68}
              rx={4} ry={2.5}
              fill={isNight ? 'rgba(160,160,160,0.35)' : 'rgba(130,130,130,0.45)'}
              animate={{ cy: [68, 61, 68], opacity: [0.45, 0.2, 0.45] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.8 }}
            />
          </>
        )}
      </g>
      {/* Iridescent oil sheen on the water surface */}
      <motion.ellipse
        cx={160} cy={98}
        rx={70} ry={5}
        fill={sheenA}
        animate={{ rx: [65, 75, 65], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' as const }}
      />
      <motion.ellipse
        cx={185} cy={102}
        rx={35} ry={2.5}
        fill={sheenB}
        animate={{ rx: [30, 40, 30], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' as const, delay: 1 }}
      />
      {/* Dark tanker silhouette when very dirty */}
      {cleanliness < 0.25 && (
        <g transform="translate(155, 93)" opacity={0.92}>
          <path d="M-22,5 L-18,0 L26,0 L22,5 Z" fill={isNight ? '#0a0f18' : '#0f172a'} />
          <rect x={-6} y={-6} width={14} height={6} rx={0.5} fill="#1e293b" />
          <rect x={0} y={-4} width={4} height={2.5} fill={isNight ? '#fbbf24' : '#475569'} opacity={0.7} />
          <rect x={12} y={-2} width={2} height={2} fill="#64748b" opacity={0.6} />
        </g>
      )}
    </g>
  );
}
