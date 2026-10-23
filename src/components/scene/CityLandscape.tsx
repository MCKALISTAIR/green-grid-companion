import { useMemo, useId } from 'react';
import { motion } from 'framer-motion';
import { getWindowLitColor } from '@/lib/windowLitColor';
import type { CityVariant } from '@/hooks/useSceneType';
import {
  getLandmarkLight,
  LANDMARK_WINDOW_LIT,
  type CityWeatherState,
} from '@/lib/cityLandmarkPalette';

export type TimeOfDayCityLandscape =
  'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'sunset' | 'dusk';

export interface CityLandscapeProps {
  cleanliness: number;
  isNight: boolean;
  synthwaveMode: boolean;
  isSnowing?: boolean;
  isChristmas?: boolean;
  skipIntro?: boolean;
  windSpeed?: number;
  timeOfDay?: TimeOfDayCityLandscape;
  /**
   * Which city this is (PR-B2). The London landmarks draw only for 'london'.
   * Defaults to 'generic' so a missing prop never shows London anywhere else.
   */
  cityVariant?: CityVariant;
  /**
   * Very-clean hero (PR-B1): the NESO band is very low. The generic church
   * spire gets a warm rim light (or lit windows after dark). London's hero
   * stays the Eye; Edinburgh's is the castle in the far layer.
   */
  landmarkHero?: boolean;
  /** Real weather for the landmark light (no sun rim under cloud, none in fog). */
  weatherState?: CityWeatherState;
}

function useCityPalette(
  cleanliness: number,
  isNight: boolean,
  synthwaveMode: boolean,
  isSnowing?: boolean,
  timeOfDay?: TimeOfDayCityLandscape,
) {
  return useMemo(() => {
    if (synthwaveMode) {
      return {
        skylineFarHighlight: '#3c096c',
        skylineFarShadow: '#15002b',
        skylineMidHighlight: '#5a189a',
        skylineMidShadow: '#240046',
        skylineNearHighlight: '#7b2cbf',
        skylineNearShadow: '#3c096c',
        road: '#10002b',
        windowLit: '#e0aaff',
        windowDark: '#3c096c',
      };
    }
    if (isSnowing) {
      return {
        skylineFarHighlight: isNight ? '#2d3748' : '#cbd5e1',
        skylineFarShadow: isNight ? '#0c1222' : '#94a3b8',
        skylineMidHighlight: isNight ? '#334155' : '#e2e8f0',
        skylineMidShadow: isNight ? '#151d30' : '#cbd5e1',
        skylineNearHighlight: isNight ? '#475569' : '#ffffff',
        skylineNearShadow: isNight ? '#1e293b' : '#e2e8f0',
        road: isNight ? '#0f172a' : '#64748b',
        windowLit: getWindowLitColor(cleanliness, isNight ? 'night' : timeOfDay),
        windowDark: isNight ? '#0f172a' : '#94a3b8',
      };
    }
    if (isNight) {
      return {
        skylineFarHighlight: '#151d30',
        skylineFarShadow: '#0c1222',
        skylineMidHighlight: '#1e293b',
        skylineMidShadow: '#151d30',
        skylineNearHighlight: '#334155',
        skylineNearShadow: '#1e293b',
        road: '#0f172a',
        windowLit: getWindowLitColor(cleanliness, 'night'),
        windowDark: '#0f172a',
      };
    }

    const isClean = cleanliness > 0.5;

    if (timeOfDay === 'dawn') {
      return {
        skylineFarHighlight: isClean ? '#4b5563' : '#57534e',
        skylineFarShadow: isClean ? '#1f2937' : '#292524',
        skylineMidHighlight: isClean ? '#6b7280' : '#78716c',
        skylineMidShadow: isClean ? '#374151' : '#44403c',
        skylineNearHighlight: isClean ? '#9ca3af' : '#a8a29e',
        skylineNearShadow: isClean ? '#4b5563' : '#57534e',
        road: '#374151',
        windowLit: getWindowLitColor(cleanliness, 'dawn'),
        windowDark: '#374151',
      };
    }
    if (timeOfDay === 'sunset') {
      return {
        skylineFarHighlight: isClean ? '#f97316' : '#ea580c',
        skylineFarShadow: isClean ? '#374151' : '#44403c',
        skylineMidHighlight: isClean ? '#fdba74' : '#f97316',
        skylineMidShadow: isClean ? '#4b5563' : '#57534e',
        skylineNearHighlight: isClean ? '#ffedd5' : '#fdb574',
        skylineNearShadow: isClean ? '#6b7280' : '#78716c',
        road: '#374151',
        windowLit: getWindowLitColor(cleanliness, 'sunset'),
        windowDark: '#374151',
      };
    }
    if (timeOfDay === 'dusk') {
      return {
        skylineFarHighlight: '#334155',
        skylineFarShadow: '#1e293b',
        skylineMidHighlight: '#475569',
        skylineMidShadow: '#334155',
        skylineNearHighlight: '#64748b',
        skylineNearShadow: '#475569',
        road: '#1e293b',
        windowLit: getWindowLitColor(cleanliness, 'dusk'),
        windowDark: '#1e293b',
      };
    }

    return {
      // Daytime mass: solid mid greys so the city reads as buildings, not glass fog
      skylineFarHighlight: isClean ? '#78818f' : '#7c756e',
      skylineFarShadow: isClean ? '#3f4654' : '#4a453f',
      skylineMidHighlight: isClean ? '#b8bec8' : '#c4bfb8',
      skylineMidShadow: isClean ? '#5b6472' : '#6b655e',
      skylineNearHighlight: isClean ? '#eceff3' : '#f0eeeb',
      skylineNearShadow: isClean ? '#8b93a0' : '#9a948c',
      road: '#374151',
      windowLit: getWindowLitColor(cleanliness, timeOfDay),
      windowDark: isClean ? '#7c8491' : '#8a847c',
    };
  }, [cleanliness, isNight, synthwaveMode, isSnowing, timeOfDay]);
}

// Individual building component
function Building({
  x,
  width,
  height,
  fill,
  windowLit,
  windowDark,
  isNight,
  cleanliness,
  delay = 0,
  skipIntro,
  windowsFlicker = false,
  antenna = true,
}: {
  x: number;
  width: number;
  height: number;
  fill: string;
  windowLit: string;
  windowDark: string;
  isNight: boolean;
  cleanliness: number;
  delay?: number;
  skipIntro?: boolean;
  windowsFlicker?: boolean;
  /** Rooftop mast on tall blocks. Off for the neutral skyline (brief §11.1: no antennae). */
  antenna?: boolean;
}) {
  // Window grid
  const windowRows = Math.floor(height / 12);
  const windowCols = Math.floor(width / 10);
  const windowWidth = 4;
  const windowHeight = 5;

  // Daytime: almost no lit windows. Dusk/night: more lights; dirty → busier glow.
  const litProbability = isNight
    ? cleanliness > 0.7
      ? 0.35
      : 0.72
    : windowsFlicker
      ? cleanliness > 0.7
        ? 0.22
        : 0.45
      : 0.04;

  // Stable window pattern based on position
  const windows = useMemo(() => {
    const result: { wx: number; wy: number; lit: boolean; flickerDelay: number }[] = [];
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        const seed = (x * 17 + row * 31 + col * 7) % 100;
        const wy = 150 - height + 8 + row * 12;
        if (wy + windowHeight <= 133) {
          result.push({
            wx: x + 3 + col * 10,
            wy,
            lit: seed < litProbability * 100,
            flickerDelay: (seed % 17) * 0.35,
          });
        }
      }
    }
    return result;
  }, [x, height, windowRows, windowCols, litProbability]);

  return (
    <motion.g
      initial={skipIntro ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.2, delay, ease: 'easeOut' as const }}
    >
      <rect x={x} y={150 - height} width={width} height={height} fill={fill} />
      <rect x={x} y={150 - height} width={width} height={2} fill="rgba(255,255,255,0.1)" />

      {windows.map((w, i) =>
        windowsFlicker && w.lit ? (
          <motion.rect
            key={i}
            x={w.wx}
            y={w.wy}
            width={windowWidth}
            height={windowHeight}
            fill={windowLit}
            animate={{ opacity: [0.45, 0.95, 0.55, 0.9] }}
            transition={{
              duration: 3.2 + (w.flickerDelay % 1.5),
              delay: w.flickerDelay,
              repeat: Infinity,
              ease: 'easeInOut' as const,
            }}
          />
        ) : (
          <rect
            key={i}
            x={w.wx}
            y={w.wy}
            width={windowWidth}
            height={windowHeight}
            fill={w.lit ? windowLit : windowDark}
            opacity={w.lit ? (isNight ? 0.9 : 0.55) : 0.35}
          />
        ),
      )}

      {/* Sparse rooftop solar when clean + daytime */}
      {!isNight &&
        cleanliness > 0.55 &&
        width >= 18 &&
        (x * 13) % 100 < 18 &&
        (() => {
          const roofY = 150 - height;
          const panelX = x + width * 0.2;
          return (
            <>
              <rect
                x={panelX + 1}
                y={roofY - 2}
                width={1}
                height={2.5}
                fill="rgba(150,150,150,0.6)"
              />
              <rect
                x={panelX + 6}
                y={roofY - 2}
                width={1}
                height={2.5}
                fill="rgba(150,150,150,0.6)"
              />
              <rect
                x={panelX}
                y={roofY - 3.5}
                width={8}
                height={2}
                fill="#1e40af"
                opacity={0.75}
                rx={0.3}
              />
              <rect
                x={panelX + 0.5}
                y={roofY - 3.2}
                width={7}
                height={0.4}
                fill="rgba(150,200,255,0.3)"
              />
            </>
          );
        })()}

      {antenna && height > 60 && (
        <line
          x1={x + width / 2}
          y1={150 - height}
          x2={x + width / 2}
          y2={150 - height - 8}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
      )}
    </motion.g>
  );
}

// ⛪ Church with spire
function ChurchSpire({
  x,
  height,
  fill,
  isNight,
  delay = 0,
  skipIntro,
}: {
  x: number;
  height: number;
  fill: string;
  isNight: boolean;
  delay?: number;
  skipIntro?: boolean;
}) {
  const baseWidth = 28;
  const spireHeight = height * 0.4;
  const bodyHeight = height - spireHeight;
  const baseY = 150 - height;

  return (
    <motion.g
      initial={skipIntro ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.2, delay, ease: 'easeOut' as const }}
    >
      {/* Church body */}
      <rect x={x} y={baseY + spireHeight} width={baseWidth} height={bodyHeight} fill={fill} />
      {/* Pitched roof */}
      <polygon
        points={`${x},${baseY + spireHeight} ${x + baseWidth / 2},${baseY + spireHeight - 8} ${x + baseWidth},${baseY + spireHeight}`}
        fill={fill}
      />
      {/* Spire */}
      <polygon
        points={`${x + baseWidth / 2 - 3},${baseY + spireHeight - 8} ${x + baseWidth / 2},${baseY} ${x + baseWidth / 2 + 3},${baseY + spireHeight - 8}`}
        fill={fill}
      />
      {/* Cross on top */}
      <line
        x1={x + baseWidth / 2}
        y1={baseY - 4}
        x2={x + baseWidth / 2}
        y2={baseY + 4}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
      />
      <line
        x1={x + baseWidth / 2 - 3}
        y1={baseY - 1}
        x2={x + baseWidth / 2 + 3}
        y2={baseY - 1}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
      />
      {/* Rose window */}
      <circle
        cx={x + baseWidth / 2}
        cy={baseY + spireHeight + bodyHeight * 0.3}
        r={4}
        fill="rgba(255,255,255,0.1)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.5"
      />
      {/* Stained glass glow at night */}
      {isNight && (
        <circle
          cx={x + baseWidth / 2}
          cy={baseY + spireHeight + bodyHeight * 0.3}
          r={4}
          fill="#c084fc"
          opacity={0.3}
        />
      )}
      {/* Door */}
      <rect
        x={x + baseWidth / 2 - 3}
        y={150 - 10}
        width={6}
        height={10}
        rx={3}
        fill="rgba(0,0,0,0.2)"
      />
    </motion.g>
  );
}

// 🕌 Domed building (museum/gallery)
function DomeBuilding({
  x,
  width,
  height,
  fill,
  isNight,
  delay = 0,
  skipIntro,
}: {
  x: number;
  width: number;
  height: number;
  fill: string;
  isNight: boolean;
  delay?: number;
  skipIntro?: boolean;
}) {
  const domeRadius = width * 0.4;
  const bodyHeight = height - domeRadius;
  const baseY = 150 - height;

  return (
    <motion.g
      initial={skipIntro ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.2, delay, ease: 'easeOut' as const }}
    >
      {/* Building base with columns */}
      <rect x={x} y={baseY + domeRadius} width={width} height={bodyHeight} fill={fill} />
      {/* Dome */}
      <ellipse
        cx={x + width / 2}
        cy={baseY + domeRadius}
        rx={domeRadius}
        ry={domeRadius}
        fill={fill}
      />
      {/* Dome highlight */}
      <ellipse
        cx={x + width / 2 - 2}
        cy={baseY + domeRadius - 3}
        rx={domeRadius * 0.6}
        ry={domeRadius * 0.5}
        fill="rgba(255,255,255,0.08)"
      />
      {/* Cupola on top */}
      <rect x={x + width / 2 - 2} y={baseY + 2} width={4} height={6} fill={fill} />
      <circle cx={x + width / 2} cy={baseY + 1} r={2.5} fill={fill} />
      {/* Columns */}
      {Array.from({ length: Math.floor(width / 8) }).map((_, i) => (
        <rect
          key={i}
          x={x + 4 + i * 8}
          y={baseY + domeRadius + 4}
          width={1.5}
          height={bodyHeight - 8}
          fill="rgba(255,255,255,0.12)"
        />
      ))}
      {/* Night dome glow */}
      {isNight && (
        <ellipse
          cx={x + width / 2}
          cy={baseY + domeRadius}
          rx={domeRadius + 3}
          ry={domeRadius + 3}
          fill="#818cf8"
          opacity={0.04}
        />
      )}
    </motion.g>
  );
}

// 🏢 Modern glass tower (Shard-like)
function GlassTower({
  x,
  width,
  height,
  fill,
  windowLit,
  isNight,
  cleanliness,
  delay = 0,
  skipIntro,
}: {
  x: number;
  width: number;
  height: number;
  fill: string;
  windowLit: string;
  isNight: boolean;
  cleanliness: number;
  delay?: number;
  skipIntro?: boolean;
}) {
  const baseY = 150 - height;
  const taperWidth = width * 0.3;

  return (
    <motion.g
      initial={skipIntro ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.2, delay, ease: 'easeOut' as const }}
    >
      {/* Tapered glass body */}
      <polygon
        points={`${x + (width - taperWidth) / 2},${baseY} ${x},${150} ${x + width},${150} ${x + (width + taperWidth) / 2},${baseY}`}
        fill={fill}
        opacity={0.9}
      />
      {/* Glass reflection strips */}
      {Array.from({ length: Math.floor(height / 8) }).map((_, i) => {
        const y = baseY + 4 + i * 8;
        const progress = i / Math.floor(height / 8);
        const leftX = x + ((width - taperWidth) / 2) * (1 - progress);
        const stripWidth = taperWidth + (width - taperWidth) * progress;
        return (
          <rect
            key={i}
            x={leftX + 1}
            y={y}
            width={stripWidth - 2}
            height={1}
            fill="rgba(150,200,255,0.15)"
          />
        );
      })}
      {/* Lit floors at night */}
      {isNight &&
        Array.from({ length: Math.floor(height / 10) }).map((_, i) => {
          const seed = (x * 13 + i * 29) % 100;
          if (seed > (cleanliness > 0.7 ? 40 : 70)) return null;
          const y = baseY + 6 + i * 10;
          if (y + 3 > 133) return null;
          const progress = (i * 10) / height;
          const leftX = x + ((width - taperWidth) / 2) * (1 - progress);
          const stripWidth = taperWidth + (width - taperWidth) * progress;
          return (
            <rect
              key={i}
              x={leftX + 2}
              y={y}
              width={stripWidth - 4}
              height={3}
              fill={windowLit}
              opacity={0.5}
              rx={0.5}
            />
          );
        })}
      {/* Antenna/spire at top */}
      <line
        x1={x + width / 2}
        y1={baseY}
        x2={x + width / 2}
        y2={baseY - 10}
        stroke="rgba(200,200,200,0.3)"
        strokeWidth="0.8"
      />
      {/* Aviation warning light */}
      {isNight && (
        <motion.circle
          cx={x + width / 2}
          cy={baseY - 10}
          r={1}
          fill="#ef4444"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.g>
  );
}

// 🏛️ Clock tower (Big Ben style)
function ClockTower({
  x,
  height,
  fill,
  isNight,
  delay = 0,
  skipIntro,
}: {
  x: number;
  height: number;
  fill: string;
  isNight: boolean;
  delay?: number;
  skipIntro?: boolean;
}) {
  const baseWidth = 16;
  const baseY = 150 - height;

  return (
    <motion.g
      initial={skipIntro ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.2, delay, ease: 'easeOut' as const }}
    >
      {/* Tower body */}
      <rect x={x} y={baseY + 15} width={baseWidth} height={height - 15} fill={fill} />
      {/* Upper section (narrower) */}
      <rect x={x + 2} y={baseY + 8} width={baseWidth - 4} height={10} fill={fill} />
      {/* Pointed roof */}
      <polygon
        points={`${x + 2},${baseY + 8} ${x + baseWidth / 2},${baseY} ${x + baseWidth - 2},${baseY + 8}`}
        fill={fill}
      />
      {/* Clock face */}
      <circle
        cx={x + baseWidth / 2}
        cy={baseY + 22}
        r={5}
        fill="rgba(255,255,255,0.15)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.5"
      />
      {/* Clock hands */}
      <line
        x1={x + baseWidth / 2}
        y1={baseY + 22}
        x2={x + baseWidth / 2}
        y2={baseY + 18}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.5"
      />
      <line
        x1={x + baseWidth / 2}
        y1={baseY + 22}
        x2={x + baseWidth / 2 + 3}
        y2={baseY + 22}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.5"
      />
      {/* Clock glow at night */}
      {isNight && (
        <circle cx={x + baseWidth / 2} cy={baseY + 22} r={6} fill="#fbbf24" opacity={0.15} />
      )}
    </motion.g>
  );
}

// 🎨 Art Deco building (stepped/ziggurat top)
function ArtDecoBuilding({
  x,
  width,
  height,
  fill,
  windowLit,
  windowDark,
  isNight,
  cleanliness,
  delay = 0,
  skipIntro,
}: {
  x: number;
  width: number;
  height: number;
  fill: string;
  windowLit: string;
  windowDark: string;
  isNight: boolean;
  cleanliness: number;
  delay?: number;
  skipIntro?: boolean;
}) {
  const baseY = 150 - height;
  const stepCount = 3;
  const stepHeight = 6;

  return (
    <motion.g
      initial={skipIntro ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.2, delay, ease: 'easeOut' as const }}
    >
      {/* Main body */}
      <rect
        x={x}
        y={baseY + stepCount * stepHeight}
        width={width}
        height={height - stepCount * stepHeight}
        fill={fill}
      />
      {/* Stepped crown */}
      {Array.from({ length: stepCount }).map((_, i) => {
        const inset = (i + 1) * 3;
        return (
          <rect
            key={i}
            x={x + inset}
            y={baseY + i * stepHeight}
            width={width - inset * 2}
            height={stepHeight + 1}
            fill={fill}
          />
        );
      })}
      {/* Decorative vertical lines */}
      {Array.from({ length: Math.floor(width / 6) }).map((_, i) => (
        <line
          key={i}
          x1={x + 3 + i * 6}
          y1={baseY + stepCount * stepHeight}
          x2={x + 3 + i * 6}
          y2={150}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.5"
        />
      ))}
      {/* Art deco windows (taller, narrower) */}
      {Array.from({ length: Math.floor((height - stepCount * stepHeight) / 14) }).map((_, row) =>
        Array.from({ length: Math.floor(width / 10) }).map((_, col) => {
          const seed = (x * 11 + row * 23 + col * 13) % 100;
          const litProb = isNight ? (cleanliness > 0.7 ? 30 : 65) : 4;
          return (
            <rect
              key={`${row}-${col}`}
              x={x + 4 + col * 10}
              y={baseY + stepCount * stepHeight + 4 + row * 14}
              width={3}
              height={8}
              rx={1.5}
              fill={seed < litProb ? windowLit : windowDark}
              opacity={seed < litProb ? (isNight ? 0.85 : 0.5) : 0.25}
            />
          );
        }),
      )}
      {/* Pinnacle */}
      <line
        x1={x + width / 2}
        y1={baseY}
        x2={x + width / 2}
        y2={baseY - 6}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1"
      />
    </motion.g>
  );
}

// Road with lane markings
function CityRoad({ fill, skipIntro }: { fill: string; skipIntro?: boolean }) {
  return (
    <motion.g
      initial={skipIntro ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1, delay: 0.5 }}
    >
      {/* Road surface */}
      <rect x={0} y={138} width={400} height={12} fill={fill} />
      {/* Curb */}
      <rect x={0} y={137} width={400} height={1.5} fill="rgba(255,255,255,0.15)" />
      {/* Lane markings */}
      {Array.from({ length: 12 }).map((_, i) => (
        <rect
          key={i}
          x={5 + i * 34}
          y={143.5}
          width={18}
          height={1}
          fill="rgba(255,255,255,0.3)"
          rx={0.5}
        />
      ))}
      {/* Pavement/sidewalk */}
      <rect x={0} y={133} width={400} height={4} fill="rgba(255,255,255,0.05)" />
    </motion.g>
  );
}

// Far skyline (background buildings)
export function CityLandscapeBack(props: CityLandscapeProps) {
  const cityVariant = props.cityVariant ?? 'generic';
  if (cityVariant !== 'london') return <NeutralCityBack {...props} cityVariant={cityVariant} />;
  return <LondonCityBack {...props} />;
}

/** London set, back row (brief §11.4: unchanged shapes). */
function LondonCityBack(props: CityLandscapeProps) {
  const palette = useCityPalette(
    props.cleanliness,
    props.isNight,
    props.synthwaveMode,
    props.isSnowing,
    props.timeOfDay,
  );
  const id = useId();

  const buildings = useMemo(
    () => [
      { x: 0, width: 22, height: 55 },
      { x: 24, width: 18, height: 70 },
      { x: 44, width: 25, height: 45 },
      { x: 72, width: 20, height: 80 },
      { x: 94, width: 28, height: 50 },
      { x: 125, width: 15, height: 90 },
      { x: 142, width: 22, height: 60 },
      { x: 168, width: 20, height: 75 },
      { x: 190, width: 30, height: 48 },
      { x: 224, width: 18, height: 85 },
      { x: 244, width: 25, height: 55 },
      { x: 272, width: 20, height: 65 },
      { x: 294, width: 28, height: 78 },
      { x: 325, width: 22, height: 50 },
      { x: 350, width: 18, height: 70 },
      { x: 370, width: 30, height: 58 },
    ],
    [],
  );

  return (
    <g opacity={0.72}>
      <defs>
        <linearGradient id={`${id}-gradCityFar`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.skylineFarHighlight} />
          <stop offset="100%" stopColor={palette.skylineFarShadow} />
        </linearGradient>
      </defs>
      {buildings.map((b, i) => (
        <Building
          key={i}
          {...b}
          fill={`url(#${id}-gradCityFar)`}
          windowLit={palette.windowLit}
          windowDark={palette.windowDark}
          isNight={props.isNight}
          cleanliness={props.cleanliness}
          delay={i * 0.03}
          skipIntro={props.skipIntro}
          windowsFlicker={props.timeOfDay === 'dusk' || props.timeOfDay === 'night'}
        />
      ))}
      {/* Landmark: Church spire in far background */}
      <ChurchSpire
        x={155}
        height={85}
        fill={`url(#${id}-gradCityFar)`}
        isNight={props.isNight}
        delay={0.1}
        skipIntro={props.skipIntro}
      />
      {/* London landmark: Glass tower silhouette (London only, PR-B2) */}
      <g data-city-landmark="glass-tower-far">
        <GlassTower
          x={85}
          width={14}
          height={100}
          fill={`url(#${id}-gradCityFar)`}
          windowLit={palette.windowLit}
          isNight={props.isNight}
          cleanliness={props.cleanliness}
          delay={0.12}
          skipIntro={props.skipIntro}
        />
      </g>
      {/* Snow layer */}
      {props.isSnowing && (
        <rect x={0} y={133} width={400} height={17} fill="white" fillOpacity={0.15} />
      )}
    </g>
  );
}

// Mid skyline
export function CityLandscapeMid(props: CityLandscapeProps) {
  const cityVariant = props.cityVariant ?? 'generic';
  if (cityVariant !== 'london') return <NeutralCityMid {...props} cityVariant={cityVariant} />;
  return <LondonCityMid {...props} />;
}

/** London set, mid row: the dome (reads as St Paul's) and the clock tower. */
function LondonCityMid(props: CityLandscapeProps) {
  const palette = useCityPalette(
    props.cleanliness,
    props.isNight,
    props.synthwaveMode,
    props.isSnowing,
    props.timeOfDay,
  );
  const id = useId();

  const buildings = useMemo(
    () => [
      { x: 10, width: 30, height: 65 },
      { x: 45, width: 22, height: 80 },
      { x: 70, width: 35, height: 55 },
      { x: 110, width: 25, height: 95 },
      { x: 138, width: 30, height: 60 },
      { x: 172, width: 22, height: 75 },
      { x: 198, width: 35, height: 50 },
      { x: 238, width: 28, height: 88 },
      { x: 270, width: 32, height: 62 },
      { x: 306, width: 25, height: 72 },
      { x: 335, width: 30, height: 55 },
      { x: 368, width: 32, height: 68 },
    ],
    [],
  );

  return (
    <g opacity={0.9}>
      <defs>
        <linearGradient id={`${id}-gradCityMid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.skylineMidHighlight} />
          <stop offset="100%" stopColor={palette.skylineMidShadow} />
        </linearGradient>
      </defs>
      {buildings.map((b, i) => (
        <Building
          key={i}
          {...b}
          fill={`url(#${id}-gradCityMid)`}
          windowLit={palette.windowLit}
          windowDark={palette.windowDark}
          isNight={props.isNight}
          cleanliness={props.cleanliness}
          delay={0.2 + i * 0.03}
          skipIntro={props.skipIntro}
          windowsFlicker={props.timeOfDay === 'dusk' || props.timeOfDay === 'night'}
        />
      ))}
      {/* London landmark: Dome building. London only (PR-B1): it reads as St Paul's. */}
      <g data-city-landmark="dome">
        <DomeBuilding
          x={160}
          width={36}
          height={70}
          fill={`url(#${id}-gradCityMid)`}
          isNight={props.isNight}
          delay={0.25}
          skipIntro={props.skipIntro}
        />
      </g>
      {/* London landmark: Clock tower (London only, PR-B2) */}
      <g data-city-landmark="clock-tower">
        <ClockTower
          x={300}
          height={82}
          fill={`url(#${id}-gradCityMid)`}
          isNight={props.isNight}
          delay={0.28}
          skipIntro={props.skipIntro}
        />
      </g>
    </g>
  );
}

// Near skyline (foreground buildings)
export function CityLandscapeFront(props: CityLandscapeProps) {
  const cityVariant = props.cityVariant ?? 'generic';
  if (cityVariant !== 'london') return <NeutralCityFront {...props} cityVariant={cityVariant} />;
  return <LondonCityFront {...props} />;
}

/** London set, front row. */
function LondonCityFront(props: CityLandscapeProps) {
  const palette = useCityPalette(
    props.cleanliness,
    props.isNight,
    props.synthwaveMode,
    props.isSnowing,
    props.timeOfDay,
  );
  const id = useId();

  const buildings = useMemo(
    () => [
      { x: 0, width: 40, height: 45 },
      { x: 55, width: 35, height: 55 },
      { x: 100, width: 45, height: 40 },
      { x: 155, width: 38, height: 50 },
      { x: 205, width: 42, height: 38 },
      { x: 258, width: 35, height: 48 },
      { x: 305, width: 40, height: 42 },
      { x: 355, width: 45, height: 50 },
    ],
    [],
  );

  return (
    <>
      {/* Clip definition to stop buildings at sidewalk */}
      <defs>
        <clipPath id={`${id}-foreground-building-clip`}>
          <rect x={0} y={0} width={400} height={133} />
        </clipPath>
        <linearGradient id={`${id}-gradCityNear`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.skylineNearHighlight} />
          <stop offset="100%" stopColor={palette.skylineNearShadow} />
        </linearGradient>
      </defs>

      {/* Buildings clipped above road */}
      <g clipPath={`url(#${id}-foreground-building-clip)`}>
        {buildings.map((b, i) => (
          <Building
            key={i}
            x={b.x}
            width={b.width}
            height={b.height}
            fill={`url(#${id}-gradCityNear)`}
            windowLit={palette.windowLit}
            windowDark={palette.windowDark}
            isNight={props.isNight}
            cleanliness={props.cleanliness}
            delay={0.4 + i * 0.03}
            skipIntro={props.skipIntro}
            windowsFlicker={props.timeOfDay === 'dusk' || props.timeOfDay === 'night'}
          />
        ))}
        {/* Landmark: Art Deco building in foreground */}
        <ArtDecoBuilding
          x={92}
          width={32}
          height={52}
          fill={`url(#${id}-gradCityNear)`}
          windowLit={palette.windowLit}
          windowDark={palette.windowDark}
          isNight={props.isNight}
          cleanliness={props.cleanliness}
          delay={0.45}
          skipIntro={props.skipIntro}
        />
        {/* London landmark: Glass tower (Shard-like) in the foreground (London only, PR-B2) */}
        <g data-city-landmark="glass-tower-near">
          <GlassTower
            x={195}
            width={22}
            height={65}
            fill={`url(#${id}-gradCityNear)`}
            windowLit={palette.windowLit}
            isNight={props.isNight}
            cleanliness={props.cleanliness}
            delay={0.48}
            skipIntro={props.skipIntro}
          />
        </g>
      </g>

      {/* Road rendered on top */}
      <CityRoad fill={palette.road} skipIntro={props.skipIntro} />

      {/* Urban green spaces when clean */}
      {props.cleanliness > 0.5 && (
        <g>
          <UrbanTree x={48} y={133} scale={0.8} isNight={props.isNight} />
          <UrbanTree x={148} y={133} scale={0.7} isNight={props.isNight} />
          <UrbanTree x={250} y={133} scale={0.9} isNight={props.isNight} />
          <UrbanTree x={348} y={133} scale={0.75} isNight={props.isNight} />
        </g>
      )}

      {/* Street lights */}
      <StreetLight x={30} isNight={props.isNight} />
      <StreetLight x={130} isNight={props.isNight} />
      <StreetLight x={230} isNight={props.isNight} />
      <StreetLight x={330} isNight={props.isNight} />
    </>
  );
}

// ─── Neutral GB skyline (PR-B1, Design brief §11.1) ─────────────────────────
// Every city except London; Edinburgh uses the same vocabulary with the castle
// in the far layer and low buildings under it (§11.2). Heights in the tables
// below are units above the ground line (y 138); Building draws to y 150, so
// it gets u + 12. Nothing identifiable: no domes, no Eye, no tapered or pointed
// towers, no clock faces, no gasholders or mill chimneys. Static art only.

const NEUTRAL_GROUND_Y = 138;
const toBuilding = (u: number) => u + (150 - NEUTRAL_GROUND_Y);

type Block = { x: number; width: number; u: number };

/** Back row: 1960s-80s slabs and modern flats, 30-60u, flat tops; one plain tower. */
const NEUTRAL_BACK: Block[] = [
  { x: 0, width: 30, u: 30 },
  { x: 32, width: 24, u: 36 },
  { x: 58, width: 34, u: 33 },
  { x: 94, width: 26, u: 42 },
  { x: 122, width: 36, u: 38 },
  { x: 160, width: 28, u: 46 },
  { x: 190, width: 34, u: 41 },
  { x: 248, width: 30, u: 52 },
  { x: 280, width: 34, u: 47 },
  { x: 316, width: 28, u: 40 },
  { x: 346, width: 30, u: 35 },
  { x: 378, width: 22, u: 31 },
];
/** The one tower: flat top, vertical banding, at 60-70% of the visible width (off-centre). */
const NEUTRAL_TOWER: Block = { x: 226, width: 20, u: 70 };

/**
 * Edinburgh back row: the castle (x 110-198) replaces the tower, and blocks in
 * its span are capped at 14u so the rock face reads (§11.2).
 */
const EDINBURGH_BACK: Block[] = [
  { x: 0, width: 30, u: 30 },
  { x: 32, width: 24, u: 36 },
  { x: 58, width: 34, u: 33 },
  { x: 94, width: 14, u: 26 },
  { x: 150, width: 16, u: 9 },
  { x: 168, width: 22, u: 13 },
  { x: 198, width: 26, u: 38 },
  { x: 226, width: 20, u: 48 },
  { x: 248, width: 30, u: 52 },
  { x: 280, width: 34, u: 45 },
  { x: 316, width: 28, u: 40 },
  { x: 346, width: 30, u: 35 },
  { x: 378, width: 22, u: 31 },
];

/** Mid row: 3-5 storey commercial blocks, 18-40u, flat or shallow roofs. */
const NEUTRAL_MID: Block[] = [
  { x: 4, width: 30, u: 20 },
  { x: 36, width: 28, u: 26 },
  { x: 66, width: 34, u: 22 },
  { x: 102, width: 34, u: 31 },
  { x: 172, width: 32, u: 27 },
  { x: 206, width: 28, u: 36 },
  { x: 236, width: 38, u: 30 },
  { x: 276, width: 30, u: 38 },
  { x: 308, width: 36, u: 29 },
  { x: 346, width: 28, u: 24 },
  { x: 376, width: 24, u: 19 },
];
const NEUTRAL_SPIRE_X = 140;

/** Edinburgh mid row: nothing in front of the castle; the town climbs the tail on the east. */
const EDINBURGH_MID: Block[] = [
  { x: 4, width: 30, u: 20 },
  { x: 36, width: 28, u: 26 },
  { x: 66, width: 34, u: 22 },
  { x: 188, width: 10, u: 9 },
  { x: 198, width: 14, u: 14 },
  { x: 212, width: 18, u: 20 },
  { x: 264, width: 30, u: 36 },
  { x: 296, width: 34, u: 29 },
  { x: 332, width: 30, u: 24 },
  { x: 364, width: 36, u: 20 },
];
const EDINBURGH_SPIRE_X = 232;

/** Front row: brick terraces, 12-20u, in runs of 3-6 houses with 2-3 gaps. */
type Run = { x: number; houses: number; u: number };
const HOUSE_W = 16;
const NEUTRAL_FRONT: Run[] = [
  { x: 0, houses: 5, u: 14 },
  { x: 96, houses: 5, u: 18 },
  { x: 190, houses: 6, u: 13 },
  { x: 300, houses: 6, u: 17 },
];
const NEUTRAL_TREES = [
  { x: 88, scale: 0.8 },
  { x: 183, scale: 0.7 },
  { x: 293, scale: 0.75 },
];
/** Edinburgh: a garden gap under the castle (x 110-190), then the town resumes at the tail. */
const EDINBURGH_FRONT: Run[] = [
  { x: 14, houses: 6, u: 14 },
  { x: 190, houses: 4, u: 17 },
  { x: 264, houses: 5, u: 13 },
  { x: 352, houses: 3, u: 16 },
];
const EDINBURGH_TREES = [
  { x: 6, scale: 0.6 },
  { x: 122, scale: 0.6 },
  { x: 166, scale: 0.55 },
  { x: 259, scale: 0.6 },
  { x: 348, scale: 0.55 },
];

/** Plain tower: flat top, vertical banding. No taper, point, crown or mast. */
function NeutralTower({
  block,
  fill,
  palette,
  isNight,
  cleanliness,
  skipIntro,
  windowsFlicker,
}: {
  block: Block;
  fill: string;
  palette: ReturnType<typeof useCityPalette>;
  isNight: boolean;
  cleanliness: number;
  skipIntro?: boolean;
  windowsFlicker: boolean;
}) {
  const h = toBuilding(block.u);
  return (
    <g data-city-art="neutral-tower">
      <Building
        x={block.x}
        width={block.width}
        height={h}
        fill={fill}
        windowLit={palette.windowLit}
        windowDark={palette.windowDark}
        isNight={isNight}
        cleanliness={cleanliness}
        delay={0.12}
        skipIntro={skipIntro}
        windowsFlicker={windowsFlicker}
        antenna={false}
      />
      {[0.25, 0.5, 0.75].map((f) => (
        <rect
          key={f}
          x={block.x + block.width * f - 0.4}
          y={150 - h}
          width={0.8}
          height={h - 12}
          fill="rgba(255,255,255,0.08)"
        />
      ))}
    </g>
  );
}

/** One static tower crane in the back row; dropped at 340 px wide and below (Q8). */
function NeutralFarCrane({ x, fill }: { x: number; fill: string }) {
  return (
    <g data-city-art="far-crane" className="max-[340px]:hidden" opacity={0.85}>
      <rect x={x} y={84} width={1.4} height={54} fill={fill} />
      <rect x={x - 22} y={84} width={46} height={1} fill={fill} />
      <rect x={x + 16} y={85} width={5} height={2.2} fill={fill} />
      <polygon points={`${x - 1},84 ${x + 0.7},79 ${x + 2.4},84`} fill={fill} />
      <line x1={x - 14} y1={85} x2={x - 14} y2={96} stroke={fill} strokeWidth={0.4} />
    </g>
  );
}

/**
 * Plain parish church: nave with a pitched roof (body 14u), a square tower and
 * a simple spire to 52u. No clock face, nothing recognisable. It is the generic
 * very-clean hero: a warm rim light by day, floodlit edge and lit windows after
 * dark (static, decorative).
 */
function NeutralChurchSpire({
  x,
  fill,
  windowLit,
  windowDark,
  isNight,
  light,
}: {
  x: number;
  fill: string;
  windowLit: string;
  windowDark: string;
  isNight: boolean;
  light: ReturnType<typeof getLandmarkLight>;
}) {
  const g = NEUTRAL_GROUND_Y;
  const naveTop = g - 14;
  const towerX = x + 22;
  const towerTop = g - 30;
  const apexY = g - 52;
  const lit = isNight || light.heroWindows;
  return (
    <>
      <rect x={x} y={naveTop} width={22} height={150 - naveTop} fill={fill} />
      <polygon
        points={`${x},${naveTop} ${x + 11},${naveTop - 5} ${x + 22},${naveTop}`}
        fill={fill}
      />
      <rect x={towerX} y={towerTop} width={8} height={150 - towerTop} fill={fill} />
      <polygon
        points={`${towerX - 0.5},${towerTop} ${towerX + 4},${apexY} ${towerX + 8.5},${towerTop}`}
        fill={fill}
      />
      {/* Belfry louvre and nave windows */}
      <rect
        x={towerX + 3}
        y={towerTop + 2}
        width={2}
        height={4}
        rx={1}
        fill={light.heroWindows ? LANDMARK_WINDOW_LIT : windowDark}
        opacity={light.heroWindows ? 0.95 : 0.35}
      />
      {[x + 4, x + 10, x + 16].map((wx) => (
        <rect
          key={wx}
          x={wx}
          y={naveTop + 4}
          width={2}
          height={4}
          rx={1}
          fill={light.heroWindows ? LANDMARK_WINDOW_LIT : lit ? windowLit : windowDark}
          opacity={light.heroWindows ? 0.95 : lit ? 0.7 : 0.35}
        />
      ))}
      {light.rim && (
        <path
          data-spire-rim="true"
          d={`M${x},${naveTop} L${x + 11},${naveTop - 5} L${x + 22},${naveTop} M${towerX - 0.5},${towerTop} L${towerX + 4},${apexY} L${towerX + 8.5},${towerTop} M${towerX},${towerTop} V${naveTop}`}
          fill="none"
          stroke={light.rim.color}
          strokeOpacity={light.rim.opacity}
          strokeWidth={0.6}
          strokeLinejoin="round"
        />
      )}
    </>
  );
}

/** A run of terraced houses with one pitched roof line and chimney stubs at the party walls. */
function TerraceRun({
  run,
  fill,
  palette,
  isNight,
}: {
  run: Run;
  fill: string;
  palette: ReturnType<typeof useCityPalette>;
  isNight: boolean;
}) {
  const top = NEUTRAL_GROUND_Y - run.u;
  const w = run.houses * HOUSE_W;
  const roof = 4;
  return (
    <g data-city-art="terrace">
      <rect x={run.x} y={top} width={w} height={150 - top} fill={fill} />
      <polygon
        points={`${run.x},${top} ${run.x + 1.5},${top - roof} ${run.x + w - 1.5},${top - roof} ${run.x + w},${top}`}
        fill={fill}
      />
      <rect x={run.x} y={top - roof} width={w} height={0.6} fill="rgba(0,0,0,0.12)" />
      {Array.from({ length: run.houses + 1 }).map((_, i) => {
        const cx = Math.min(run.x + w - 2.2, Math.max(run.x + 0.6, run.x + i * HOUSE_W - 0.8));
        return (
          <rect key={`c${i}`} x={cx} y={top - roof - 2} width={1.6} height={2.2} fill={fill} />
        );
      })}
      {Array.from({ length: run.houses }).map((_, i) =>
        [4, 10].map((dx) => {
          const seed = (run.x * 7 + i * 13 + dx) % 10;
          const on = isNight && seed < 5;
          return (
            <rect
              key={`w${i}-${dx}`}
              x={run.x + i * HOUSE_W + dx - 1}
              y={top + 3}
              width={2}
              height={3}
              fill={on ? palette.windowLit : palette.windowDark}
              opacity={on ? 0.85 : 0.35}
            />
          );
        }),
      )}
    </g>
  );
}

function NeutralCityBack(props: CityLandscapeProps & { cityVariant: CityVariant }) {
  const palette = useCityPalette(
    props.cleanliness,
    props.isNight,
    props.synthwaveMode,
    props.isSnowing,
    props.timeOfDay,
  );
  const id = useId();
  const isEdinburgh = props.cityVariant === 'edinburgh';
  const blocks = isEdinburgh ? EDINBURGH_BACK : NEUTRAL_BACK;
  const fill = `url(#${id}-gradCityFar)`;
  const flicker = props.timeOfDay === 'dusk' || props.timeOfDay === 'night';
  return (
    // Design review of #190: opaque in Edinburgh so the castle never shows through the back row.
    <g opacity={isEdinburgh ? 1 : 0.72} data-city-art={`${props.cityVariant}-back`}>
      <defs>
        <linearGradient id={`${id}-gradCityFar`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.skylineFarHighlight} />
          <stop offset="100%" stopColor={palette.skylineFarShadow} />
        </linearGradient>
      </defs>
      <NeutralFarCrane x={322} fill={palette.skylineFarShadow} />
      {blocks.map((b, i) => (
        <Building
          key={i}
          x={b.x}
          width={b.width}
          height={toBuilding(b.u)}
          fill={fill}
          windowLit={palette.windowLit}
          windowDark={palette.windowDark}
          isNight={props.isNight}
          cleanliness={props.cleanliness}
          delay={i * 0.03}
          skipIntro={props.skipIntro}
          windowsFlicker={flicker}
          antenna={false}
        />
      ))}
      {!isEdinburgh && (
        <NeutralTower
          block={NEUTRAL_TOWER}
          fill={fill}
          palette={palette}
          isNight={props.isNight}
          cleanliness={props.cleanliness}
          skipIntro={props.skipIntro}
          windowsFlicker={flicker}
        />
      )}
      {props.isSnowing && (
        <rect x={0} y={133} width={400} height={17} fill="white" fillOpacity={0.15} />
      )}
    </g>
  );
}

function NeutralCityMid(props: CityLandscapeProps & { cityVariant: CityVariant }) {
  const palette = useCityPalette(
    props.cleanliness,
    props.isNight,
    props.synthwaveMode,
    props.isSnowing,
    props.timeOfDay,
  );
  const id = useId();
  const isEdinburgh = props.cityVariant === 'edinburgh';
  const blocks = isEdinburgh ? EDINBURGH_MID : NEUTRAL_MID;
  const fill = `url(#${id}-gradCityMid)`;
  // Edinburgh's very-clean hero is the castle, so its spire is never rim-lit.
  const heroLit = !isEdinburgh && Boolean(props.landmarkHero);
  const light = getLandmarkLight({
    timeOfDay: props.timeOfDay ?? 'midday',
    weather: props.weatherState ?? 'clear',
    heroLit,
    synthwaveMode: props.synthwaveMode,
  });
  return (
    <g opacity={0.9} data-city-art={`${props.cityVariant}-mid`}>
      <defs>
        <linearGradient id={`${id}-gradCityMid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.skylineMidHighlight} />
          <stop offset="100%" stopColor={palette.skylineMidShadow} />
        </linearGradient>
      </defs>
      {blocks.map((b, i) => (
        <Building
          key={i}
          x={b.x}
          width={b.width}
          height={toBuilding(b.u)}
          fill={fill}
          windowLit={palette.windowLit}
          windowDark={palette.windowDark}
          isNight={props.isNight}
          cleanliness={props.cleanliness}
          delay={0.2 + i * 0.03}
          skipIntro={props.skipIntro}
          windowsFlicker={props.timeOfDay === 'dusk' || props.timeOfDay === 'night'}
          antenna={false}
        />
      ))}
      <g data-city-art="church-spire" data-landmark-hero={heroLit ? 'lit' : 'off'}>
        <NeutralChurchSpire
          x={isEdinburgh ? EDINBURGH_SPIRE_X : NEUTRAL_SPIRE_X}
          fill={fill}
          windowLit={palette.windowLit}
          windowDark={palette.windowDark}
          isNight={props.isNight}
          light={light}
        />
      </g>
    </g>
  );
}

function NeutralCityFront(props: CityLandscapeProps & { cityVariant: CityVariant }) {
  const palette = useCityPalette(
    props.cleanliness,
    props.isNight,
    props.synthwaveMode,
    props.isSnowing,
    props.timeOfDay,
  );
  const id = useId();
  const isEdinburgh = props.cityVariant === 'edinburgh';
  const runs = isEdinburgh ? EDINBURGH_FRONT : NEUTRAL_FRONT;
  const trees = isEdinburgh ? EDINBURGH_TREES : NEUTRAL_TREES;
  return (
    <>
      <defs>
        <clipPath id={`${id}-foreground-building-clip`}>
          <rect x={0} y={0} width={400} height={133} />
        </clipPath>
        <linearGradient id={`${id}-gradCityNear`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.skylineNearHighlight} />
          <stop offset="100%" stopColor={palette.skylineNearShadow} />
        </linearGradient>
      </defs>
      <g
        clipPath={`url(#${id}-foreground-building-clip)`}
        data-city-art={`${props.cityVariant}-front`}
      >
        {runs.map((r) => (
          <TerraceRun
            key={r.x}
            run={r}
            fill={`url(#${id}-gradCityNear)`}
            palette={palette}
            isNight={props.isNight}
          />
        ))}
      </g>
      <CityRoad fill={palette.road} skipIntro={props.skipIntro} />
      {props.cleanliness > 0.5 && (
        <g>
          {trees.map((t) => (
            <NeutralStreetTree key={t.x} x={t.x} scale={t.scale} isNight={props.isNight} />
          ))}
        </g>
      )}
      <StreetLight x={30} isNight={props.isNight} />
      <StreetLight x={130} isNight={props.isNight} />
      <StreetLight x={230} isNight={props.isNight} />
      <StreetLight x={330} isNight={props.isNight} />
    </>
  );
}

/** Street trees in the terrace gaps (same UrbanTree art, scales 0.6-0.8). */
function NeutralStreetTree({ x, scale, isNight }: { x: number; scale: number; isNight: boolean }) {
  return <UrbanTree x={x} y={133} scale={scale} isNight={isNight} />;
}

// Urban tree (small, trimmed)
function UrbanTree({
  x,
  y,
  scale = 1,
  isNight,
}: {
  x: number;
  y: number;
  scale?: number;
  isNight: boolean;
}) {
  return (
    <svg
      x={x - 8 * scale}
      y={y - 24 * scale}
      width={16 * scale}
      height={26 * scale}
      viewBox="-8 -24 16 26"
      preserveAspectRatio="xMidYMax meet"
      className="overflow-visible"
    >
      {/* Trunk */}
      <rect x={-1} y={-12} width={2} height={12} fill={isNight ? '#1e293b' : '#78350f'} />
      {/* Canopy */}
      <circle cx={0} cy={-16} r={6} fill={isNight ? '#1e3a2a' : '#22c55e'} opacity={0.8} />
      <circle cx={-3} cy={-14} r={4} fill={isNight ? '#15302a' : '#16a34a'} opacity={0.7} />
      <circle cx={3} cy={-14} r={4} fill={isNight ? '#15302a' : '#16a34a'} opacity={0.7} />
    </svg>
  );
}

// Street light
function StreetLight({ x, isNight }: { x: number; isNight: boolean }) {
  return (
    <g>
      {/* Pole */}
      <rect x={x} y={120} width={1.5} height={18} fill="rgba(150,150,150,0.5)" />
      {/* Arm */}
      <rect x={x - 3} y={120} width={8} height={1} fill="rgba(150,150,150,0.5)" rx={0.5} />
      {/* Light */}
      {isNight && (
        <>
          <circle cx={x + 4} cy={120} r={2} fill="#fbbf24" opacity={0.8} />
          {/* Light cone */}
          <polygon
            points={`${x + 2},121 ${x + 6},121 ${x + 10},137 ${x - 2},137`}
            fill="#fbbf24"
            opacity={0.06}
          />
        </>
      )}
    </g>
  );
}
