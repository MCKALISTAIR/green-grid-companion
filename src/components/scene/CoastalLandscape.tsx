import { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface CoastalLandscapeProps {
  cleanliness: number;
  isNight: boolean;
  synthwaveMode: boolean;
  isSnowing?: boolean;
  isChristmas?: boolean;
  skipIntro?: boolean;
  windSpeed?: number;
  timeOfDay?: 'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'sunset' | 'dusk';
}

function useCoastalPalette(cleanliness: number, isNight: boolean, synthwaveMode: boolean, isSnowing?: boolean, timeOfDay?: string) {
  return useMemo(() => {
    if (synthwaveMode) {
      return {
        seaHighlight: '#7597de', seaShadow: '#240046', sand: '#3c096c',
        cliffHighlight: '#9d4edd', cliffShadow: '#5a189a', lighthouse: '#e0aaff',
        foam: '#c77dff',
      };
    }
    if (isSnowing) {
      return {
        seaHighlight: isNight ? '#1e293b' : '#64748b', seaShadow: isNight ? '#0f172a' : '#475569',
        sand: isNight ? '#1e293b' : '#cbd5e1', 
        cliffHighlight: isNight ? '#475569' : '#e2e8f0', cliffShadow: isNight ? '#334155' : '#94a3b8',
        lighthouse: '#f1f5f9',
        foam: isNight ? '#64748b' : '#f1f5f9',
      };
    }
    if (isNight) {
      return {
        seaHighlight: '#1e3a5f', seaShadow: '#0c1929', sand: '#1a1a2e',
        cliffHighlight: '#334155', cliffShadow: '#1e293b', lighthouse: '#e2e8f0',
        foam: 'rgba(255,255,255,0.15)',
      };
    }
    const isClean = cleanliness > 0.5;
    const isSunsetish = timeOfDay === 'sunset' || timeOfDay === 'dawn' || timeOfDay === 'dusk';

    if (isSunsetish) {
      return {
        seaHighlight: isClean ? '#f97316' : '#92400e', seaShadow: isClean ? '#1e3a5f' : '#111827',
        sand: '#d4a574', 
        cliffHighlight: '#9ca3af', cliffShadow: '#374151',
        lighthouse: '#f1f5f9', foam: 'rgba(255,255,255,0.4)',
      };
    }
    return {
      seaHighlight: isClean ? '#38bdf8' : '#6b7280', seaShadow: isClean ? '#0369a1' : '#374151',
      sand: isClean ? '#f5d0a9' : '#cbd5e1', 
      cliffHighlight: isClean ? '#a8a29e' : '#78716c', cliffShadow: isClean ? '#57534e' : '#44403c',
      lighthouse: '#f1f5f9',
      foam: 'rgba(255,255,255,0.5)',
    };
  }, [cleanliness, isNight, synthwaveMode, isSnowing, timeOfDay]);
}

// Animated ocean waves
function OceanWaves({ sea, seaHighlight, foam, skipIntro }: { sea: string; seaHighlight: string; foam: string; skipIntro?: boolean }) {
  return (
    <motion.g
      initial={skipIntro ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.5 }}
    >
      {/* Deep sea */}
      <rect x={0} y={85} width={400} height={65} fill={sea} />
      {/* Wave layers */}
      <motion.path
        d="M0,95 Q50,90 100,95 T200,95 T300,95 T400,95 L400,100 L0,100 Z"
        fill={seaHighlight}
        opacity={0.3}
        animate={{ d: [
          "M0,95 Q50,90 100,95 T200,95 T300,95 T400,95 L400,100 L0,100 Z",
          "M0,95 Q50,98 100,93 T200,97 T300,93 T400,95 L400,100 L0,100 Z",
          "M0,95 Q50,90 100,95 T200,95 T300,95 T400,95 L400,100 L0,100 Z",
        ] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M0,100 Q60,96 120,100 T240,100 T360,100 T400,100 L400,106 L0,106 Z"
        fill={seaHighlight}
        opacity={0.2}
        animate={{ d: [
          "M0,100 Q60,96 120,100 T240,100 T360,100 T400,100 L400,106 L0,106 Z",
          "M0,100 Q60,103 120,98 T240,102 T360,98 T400,100 L400,106 L0,106 Z",
          "M0,100 Q60,96 120,100 T240,100 T360,100 T400,100 L400,106 L0,106 Z",
        ] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      {/* Foam/surf line on shore */}
      <motion.path
        d="M200,108 Q220,106 240,108 T280,108 T320,108 T360,108 T400,108"
        stroke={foam}
        strokeWidth="1.5"
        fill="none"
        animate={{ d: [
          "M200,108 Q220,106 240,108 T280,108 T320,108 T360,108 T400,108",
          "M195,109 Q220,107 245,109 T285,108 T325,109 T365,108 T400,109",
          "M200,108 Q220,106 240,108 T280,108 T320,108 T360,108 T400,108",
        ] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.g>
  );
}

// Lighthouse
function Lighthouse({ x, isNight, fill, skipIntro }: { x: number; isNight: boolean; fill: string; skipIntro?: boolean }) {
  return (
    <motion.g
      initial={skipIntro ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.2, delay: 0.3, ease: 'easeOut' }}
    >
      {/* Tower base (wider) */}
      <polygon points={`${x - 6},108 ${x - 4},70 ${x + 4},70 ${x + 6},108`} fill={fill} />
      {/* Red stripes */}
      <rect x={x - 5} y={78} width={10} height={5} fill="#dc2626" opacity={0.8} />
      <rect x={x - 5} y={90} width={10} height={5} fill="#dc2626" opacity={0.8} />
      <rect x={x - 4.5} y={100} width={9} height={5} fill="#dc2626" opacity={0.8} />
      {/* Lamp room */}
      <rect x={x - 5} y={66} width={10} height={5} fill="#1f2937" />
      <rect x={x - 6} y={65} width={12} height={2} fill="#374151" />
      {/* Dome */}
      <path d={`M${x - 4},65 Q${x},60 ${x + 4},65`} fill="#374151" />
      {/* Light beam */}
      {isNight && (
        <motion.g
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.1, 0.5, 0.6] }}
        >
          <polygon
            points={`${x},67 ${x - 60},50 ${x - 50},45`}
            fill="#fbbf24"
            opacity={0.15}
          />
          <polygon
            points={`${x},67 ${x + 60},50 ${x + 50},45`}
            fill="#fbbf24"
            opacity={0.15}
          />
          <circle cx={x} cy={67} r={3} fill="#fbbf24" opacity={0.6} />
        </motion.g>
      )}
      {/* Daytime lamp glass */}
      {!isNight && (
        <rect x={x - 3} y={67} width={6} height={3} fill="rgba(200,230,255,0.4)" rx={1} />
      )}
      {/* Door */}
      <rect x={x - 2} y={103} width={4} height={5} rx={2} fill="rgba(0,0,0,0.3)" />
    </motion.g>
  );
}

// Cliff/headland
function Cliff({ side, fill, highlight, skipIntro }: { side: 'left' | 'right'; fill: string; highlight: string; skipIntro?: boolean }) {
  const isLeft = side === 'left';
  return (
    <motion.g
      initial={skipIntro ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1 }}
    >
      {isLeft ? (
        <>
          <polygon points="0,60 0,150 80,150 60,108 40,85 20,72" fill={fill} />
          <polygon points="0,60 20,72 40,85 30,80 10,68 0,62" fill={highlight} opacity={0.3} />
        </>
      ) : (
        <>
          <polygon points="400,55 400,150 300,150 320,108 340,80 370,65" fill={fill} />
          <polygon points="400,55 370,65 380,62 400,57" fill={highlight} opacity={0.3} />
        </>
      )}
    </motion.g>
  );
}

// Sandy beach
function Beach({ sand, skipIntro }: { sand: string; skipIntro?: boolean }) {
  return (
    <motion.g
      initial={skipIntro ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1, delay: 0.2 }}
    >
      <path d="M180,110 Q230,106 280,108 T360,110 L400,110 L400,150 L180,150 Z" fill={sand} />
      {/* Beach texture dots */}
      {[190, 210, 240, 260, 290, 310, 340, 360].map((bx, i) => (
        <circle key={i} cx={bx} cy={115 + (i % 3) * 4} r={0.5} fill="rgba(0,0,0,0.08)" />
      ))}
    </motion.g>
  );
}

// Harbour wall / jetty
function HarbourWall({ skipIntro }: { skipIntro?: boolean }) {
  return (
    <motion.g
      initial={skipIntro ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1, delay: 0.5 }}
    >
      <rect x={140} y={106} width={50} height={4} fill="#57534e" />
      <rect x={140} y={106} width={50} height={1} fill="rgba(255,255,255,0.1)" />
      {/* Posts */}
      {[145, 155, 165, 175, 185].map((px, i) => (
        <rect key={i} x={px} y={100} width={2} height={10} fill="#44403c" />
      ))}
    </motion.g>
  );
}

// Background layer: distant sea + horizon
export function CoastalLandscapeBack(props: CoastalLandscapeProps) {
  const palette = useCoastalPalette(props.cleanliness, props.isNight, props.synthwaveMode, props.isSnowing, props.timeOfDay);

  return (
    <g>
      <defs>
        <linearGradient id="gradSea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.seaHighlight} />
          <stop offset="100%" stopColor={palette.seaShadow} />
        </linearGradient>
      </defs>
      <OceanWaves sea="url(#gradSea)" seaHighlight={palette.seaHighlight} foam={palette.foam} skipIntro={props.skipIntro} />
    </g>
  );
}

// Mid layer: cliffs + lighthouse
export function CoastalLandscapeMid(props: CoastalLandscapeProps) {
  const palette = useCoastalPalette(props.cleanliness, props.isNight, props.synthwaveMode, props.isSnowing, props.timeOfDay);

  return (
    <g>
      <defs>
        <linearGradient id="gradCliff" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.cliffHighlight} />
          <stop offset="100%" stopColor={palette.cliffShadow} />
        </linearGradient>
      </defs>
      <Cliff side="left" fill="url(#gradCliff)" highlight={palette.cliffHighlight} skipIntro={props.skipIntro} />
      <Lighthouse x={35} isNight={props.isNight} fill={palette.lighthouse} skipIntro={props.skipIntro} />
    </g>
  );
}

// Front layer: beach + harbour
export function CoastalLandscapeFront(props: CoastalLandscapeProps) {
  const palette = useCoastalPalette(props.cleanliness, props.isNight, props.synthwaveMode, props.isSnowing, props.timeOfDay);

  return (
    <g>
      <defs>
        <linearGradient id="gradCliff" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.cliffHighlight} />
          <stop offset="100%" stopColor={palette.cliffShadow} />
        </linearGradient>
      </defs>
      <Cliff side="right" fill="url(#gradCliff)" highlight={palette.cliffHighlight} skipIntro={props.skipIntro} />
      <Beach sand={palette.sand} skipIntro={props.skipIntro} />
      <HarbourWall skipIntro={props.skipIntro} />
    </g>
  );
}
