import { motion } from 'framer-motion';
import { useMemo } from 'react';

/**
 * Snow ground cover — white undulating layer at the base of the scene.
 * Intensity controls how thick the snow looks (0-1).
 */
export function SnowGround({ intensity = 0.6 }: { intensity?: number }) {
  const opacity = 0.5 + intensity * 0.4;

  const snowSparkles = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      cx: 15 + i * 33,
      cy: 18 + (i % 3) * 4,
      duration: 2 + Math.random(),
      delay: Math.random() * 2,
    }));
  }, []);

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 pointer-events-none z-28"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2 }}
    >
      <svg
        viewBox="0 0 400 40"
        className="w-full h-[40px] md:h-[60px]"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Base snow layer */}
        <path
          d="M0,15 Q50,5 100,12 Q150,20 200,10 Q250,4 300,14 Q350,22 400,8 L400,40 L0,40 Z"
          fill="white"
          fillOpacity={opacity}
        />
        {/* Secondary drift layer */}
        <path
          d="M0,20 Q60,12 120,18 Q180,24 240,14 Q300,8 360,16 Q380,20 400,14 L400,40 L0,40 Z"
          fill="white"
          fillOpacity={opacity * 0.7}
        />
        {/* Snow sparkle dots */}
        {snowSparkles.map((sparkle) => (
          <motion.circle
            key={sparkle.id}
            cx={sparkle.cx}
            cy={sparkle.cy}
            r={0.8}
            fill="white"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: sparkle.duration,
              delay: sparkle.delay,
              repeat: Infinity,
            }}
          />
        ))}
      </svg>
    </motion.div>
  );
}

/**
 * Frozen pond — small icy area in the landscape with a subtle shimmer.
 */
export function FrozenPond() {
  return (
    <motion.div
      className="absolute bottom-[12%] left-[55%] pointer-events-none z-11"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 1.5 }}
    >
      <svg width="80" height="30" viewBox="0 0 80 30" aria-hidden="true">
        {/* Ice surface */}
        <ellipse cx="40" cy="15" rx="38" ry="13" fill="hsl(200 40% 85%)" opacity="0.7" />
        {/* Ice reflection highlight */}
        <motion.ellipse
          cx="40"
          cy="12"
          rx="25"
          ry="6"
          fill="white"
          opacity={0.3}
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
        />
        {/* Crack lines */}
        <path d="M20,15 L35,10 L50,16" stroke="hsl(200 30% 75%)" strokeWidth="0.5" fill="none" opacity="0.5" />
        <path d="M30,18 L45,13 L60,17" stroke="hsl(200 30% 75%)" strokeWidth="0.3" fill="none" opacity="0.4" />
      </svg>
    </motion.div>
  );
}

/**
 * Icicles hanging from factory/structure edges.
 */
export function Icicles({ x = 0, count = 5 }: { x?: number; count?: number }) {
  const icicles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      offsetX: i * 6,
      height: 6 + Math.random() * 8,
      delay: Math.random() * 2,
    })),
    [count]
  );

  return (
    <g transform={`translate(${x}, 0)`}>
      {icicles.map((ic) => (
        <motion.path
          key={ic.id}
          d={`M${ic.offsetX},0 L${ic.offsetX + 1.5},${ic.height} L${ic.offsetX + 3},0`}
          fill="hsl(200 50% 90%)"
          stroke="hsl(200 40% 80%)"
          strokeWidth="0.3"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1.5, delay: ic.delay }}
          style={{ transformOrigin: 'top' }}
        />
      ))}
    </g>
  );
}

/**
 * Breath mist — small puffs appearing from sheep/animal positions in cold weather.
 */
export function BreathMist({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: `${x}%`, bottom: `${y}%` }}
    >
      <motion.div
        className="w-3 h-2 rounded-full bg-card/40 blur-[2px]"
        animate={{
          opacity: [0, 0.6, 0],
          scale: [0.5, 1.2, 0.8],
          x: [0, 8, 15],
          y: [0, -4, -8],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          repeatDelay: 3 + Math.random() * 2,
        }}
      />
    </motion.div>
  );
}

/**
 * Snow-dusted solar panels — shows snow accumulation on panels.
 */
export function SnowOnPanels() {
  return (
    <motion.div
      className="absolute bottom-6 right-6 flex gap-1.5 pointer-events-none z-35"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="relative w-7 h-5">
          {/* Snow cap on top of each panel */}
          <div
            className="absolute -top-1 left-0 right-0 h-2 bg-white/80 rounded-t-sm"
            style={{ clipPath: 'polygon(0% 60%, 20% 0%, 80% 20%, 100% 50%, 100% 100%, 0% 100%)' }}
          />
        </div>
      ))}
    </motion.div>
  );
}
