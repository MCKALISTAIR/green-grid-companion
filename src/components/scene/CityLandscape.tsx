import { useMemo } from 'react';
import { motion } from 'framer-motion';

export type TimeOfDayCityLandscape = 'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'sunset' | 'dusk';

export interface CityLandscapeProps {
  cleanliness: number;
  isNight: boolean;
  synthwaveMode: boolean;
  isSnowing?: boolean;
  isChristmas?: boolean;
  skipIntro?: boolean;
  windSpeed?: number;
  timeOfDay?: TimeOfDayCityLandscape;
}

function useCityPalette(cleanliness: number, isNight: boolean, synthwaveMode: boolean, isSnowing?: boolean, timeOfDay?: TimeOfDayCityLandscape) {
  return useMemo(() => {
    if (synthwaveMode) {
      return {
        skylineFar: '#240046',
        skylineMid: '#3c096c',
        skylineNear: '#5a189a',
        road: '#10002b',
        windowLit: '#e0aaff',
        windowDark: '#3c096c',
      };
    }
    if (isSnowing) {
      return {
        skylineFar: isNight ? '#1e293b' : '#94a3b8',
        skylineMid: isNight ? '#334155' : '#cbd5e1',
        skylineNear: isNight ? '#475569' : '#e2e8f0',
        road: isNight ? '#0f172a' : '#64748b',
        windowLit: '#fbbf24',
        windowDark: isNight ? '#0f172a' : '#94a3b8',
      };
    }
    if (isNight) {
      return {
        skylineFar: '#0c1222',
        skylineMid: '#151d30',
        skylineNear: '#1e293b',
        road: '#0f172a',
        windowLit: '#fbbf24',
        windowDark: '#0f172a',
      };
    }

    const isClean = cleanliness > 0.5;

    if (timeOfDay === 'dawn') {
      return {
        skylineFar: isClean ? '#374151' : '#44403c',
        skylineMid: isClean ? '#4b5563' : '#57534e',
        skylineNear: isClean ? '#6b7280' : '#78716c',
        road: '#374151',
        windowLit: '#fcd34d',
        windowDark: '#374151',
      };
    }
    if (timeOfDay === 'sunset') {
      return {
        skylineFar: isClean ? '#374151' : '#44403c',
        skylineMid: isClean ? '#4b5563' : '#57534e',
        skylineNear: isClean ? '#6b7280' : '#78716c',
        road: '#374151',
        windowLit: '#fb923c',
        windowDark: '#374151',
      };
    }
    if (timeOfDay === 'dusk') {
      return {
        skylineFar: '#1e293b',
        skylineMid: '#334155',
        skylineNear: '#475569',
        road: '#1e293b',
        windowLit: '#fbbf24',
        windowDark: '#1e293b',
      };
    }

    return {
      skylineFar: isClean ? '#6b7280' : '#78716c',
      skylineMid: isClean ? '#9ca3af' : '#a8a29e',
      skylineNear: isClean ? '#d1d5db' : '#d6d3d1',
      road: '#4b5563',
      windowLit: '#fbbf24',
      windowDark: isClean ? '#9ca3af' : '#a8a29e',
    };
  }, [cleanliness, isNight, synthwaveMode, isSnowing, timeOfDay]);
}

// Individual building component
function Building({ x, width, height, fill, windowLit, windowDark, isNight, cleanliness, delay = 0, skipIntro }: {
  x: number; width: number; height: number; fill: string;
  windowLit: string; windowDark: string; isNight: boolean; cleanliness: number;
  delay?: number; skipIntro?: boolean;
}) {
  // Window grid
  const windowRows = Math.floor(height / 12);
  const windowCols = Math.floor(width / 10);
  const windowWidth = 4;
  const windowHeight = 5;

  // At night, more windows lit. When clean energy, fewer office lights (energy saving)
  const litProbability = isNight ? (cleanliness > 0.7 ? 0.3 : 0.7) : 0.15;

  // Stable window pattern based on position
  const windows = useMemo(() => {
    const result: { wx: number; wy: number; lit: boolean }[] = [];
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        const seed = (x * 17 + row * 31 + col * 7) % 100;
        result.push({
          wx: x + 3 + col * 10,
          wy: 150 - height + 8 + row * 12,
          lit: seed < litProbability * 100,
        });
      }
    }
    return result;
  }, [x, height, windowRows, windowCols, litProbability]);

  return (
    <motion.g
      initial={skipIntro ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.2, delay, ease: 'easeOut' }}
    >
      {/* Building body */}
      <rect x={x} y={150 - height} width={width} height={height} fill={fill} />
      {/* Roof line */}
      <rect x={x} y={150 - height} width={width} height={2} fill="rgba(255,255,255,0.1)" />

      {/* Windows */}
      {windows.map((w, i) => (
        <rect
          key={i}
          x={w.wx}
          y={w.wy}
          width={windowWidth}
          height={windowHeight}
          fill={w.lit ? windowLit : windowDark}
          opacity={w.lit ? (isNight ? 0.9 : 0.6) : 0.3}
          rx={0.5}
        />
      ))}

      {/* Rooftop solar panels when clean */}
      {cleanliness > 0.6 && width > 20 && (
        <g>
          {Array.from({ length: Math.floor(width / 12) }).map((_, i) => (
            <rect
              key={`solar-${i}`}
              x={x + 4 + i * 12}
              y={150 - height - 3}
              width={8}
              height={2}
              fill="#1e40af"
              opacity={0.7}
              transform={`skewX(-10)`}
            />
          ))}
        </g>
      )}

      {/* Rooftop antenna/detail */}
      {height > 60 && (
        <line
          x1={x + width / 2} y1={150 - height}
          x2={x + width / 2} y2={150 - height - 8}
          stroke="rgba(255,255,255,0.2)" strokeWidth="1"
        />
      )}
    </motion.g>
  );
}

// ⛪ Church with spire
function ChurchSpire({ x, height, fill, isNight, delay = 0, skipIntro }: {
  x: number; height: number; fill: string; isNight: boolean; delay?: number; skipIntro?: boolean;
}) {
  const baseWidth = 28;
  const spireHeight = height * 0.4;
  const bodyHeight = height - spireHeight;
  const baseY = 150 - height;

  return (
    <motion.g
      initial={skipIntro ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.2, delay, ease: 'easeOut' }}
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
      <line x1={x + baseWidth / 2} y1={baseY - 4} x2={x + baseWidth / 2} y2={baseY + 4} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <line x1={x + baseWidth / 2 - 3} y1={baseY - 1} x2={x + baseWidth / 2 + 3} y2={baseY - 1} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      {/* Rose window */}
      <circle cx={x + baseWidth / 2} cy={baseY + spireHeight + bodyHeight * 0.3} r={4} fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      {/* Stained glass glow at night */}
      {isNight && (
        <circle cx={x + baseWidth / 2} cy={baseY + spireHeight + bodyHeight * 0.3} r={4} fill="#c084fc" opacity={0.3} />
      )}
      {/* Door */}
      <rect x={x + baseWidth / 2 - 3} y={150 - 10} width={6} height={10} rx={3} fill="rgba(0,0,0,0.2)" />
    </motion.g>
  );
}

// 🕌 Domed building (museum/gallery)
function DomeBuilding({ x, width, height, fill, isNight, delay = 0, skipIntro }: {
  x: number; width: number; height: number; fill: string; isNight: boolean; delay?: number; skipIntro?: boolean;
}) {
  const domeRadius = width * 0.4;
  const bodyHeight = height - domeRadius;
  const baseY = 150 - height;

  return (
    <motion.g
      initial={skipIntro ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.2, delay, ease: 'easeOut' }}
    >
      {/* Building base with columns */}
      <rect x={x} y={baseY + domeRadius} width={width} height={bodyHeight} fill={fill} />
      {/* Dome */}
      <ellipse cx={x + width / 2} cy={baseY + domeRadius} rx={domeRadius} ry={domeRadius} fill={fill} />
      {/* Dome highlight */}
      <ellipse cx={x + width / 2 - 2} cy={baseY + domeRadius - 3} rx={domeRadius * 0.6} ry={domeRadius * 0.5} fill="rgba(255,255,255,0.08)" />
      {/* Cupola on top */}
      <rect x={x + width / 2 - 2} y={baseY + 2} width={4} height={6} fill={fill} />
      <circle cx={x + width / 2} cy={baseY + 1} r={2.5} fill={fill} />
      {/* Columns */}
      {Array.from({ length: Math.floor(width / 8) }).map((_, i) => (
        <rect key={i} x={x + 4 + i * 8} y={baseY + domeRadius + 4} width={1.5} height={bodyHeight - 8} fill="rgba(255,255,255,0.12)" />
      ))}
      {/* Night dome glow */}
      {isNight && (
        <ellipse cx={x + width / 2} cy={baseY + domeRadius} rx={domeRadius + 3} ry={domeRadius + 3} fill="#818cf8" opacity={0.04} />
      )}
    </motion.g>
  );
}

// 🏢 Modern glass tower (Shard-like)
function GlassTower({ x, width, height, fill, windowLit, isNight, cleanliness, delay = 0, skipIntro }: {
  x: number; width: number; height: number; fill: string; windowLit: string;
  isNight: boolean; cleanliness: number; delay?: number; skipIntro?: boolean;
}) {
  const baseY = 150 - height;
  const taperWidth = width * 0.3;

  return (
    <motion.g
      initial={skipIntro ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.2, delay, ease: 'easeOut' }}
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
        const leftX = x + (width - taperWidth) / 2 * (1 - progress);
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
      {isNight && Array.from({ length: Math.floor(height / 10) }).map((_, i) => {
        const seed = (x * 13 + i * 29) % 100;
        if (seed > (cleanliness > 0.7 ? 40 : 70)) return null;
        const y = baseY + 6 + i * 10;
        const progress = (i * 10) / height;
        const leftX = x + (width - taperWidth) / 2 * (1 - progress);
        const stripWidth = taperWidth + (width - taperWidth) * progress;
        return (
          <rect key={i} x={leftX + 2} y={y} width={stripWidth - 4} height={3} fill={windowLit} opacity={0.5} rx={0.5} />
        );
      })}
      {/* Antenna/spire at top */}
      <line
        x1={x + width / 2} y1={baseY}
        x2={x + width / 2} y2={baseY - 10}
        stroke="rgba(200,200,200,0.3)" strokeWidth="0.8"
      />
      {/* Aviation warning light */}
      {isNight && (
        <motion.circle
          cx={x + width / 2} cy={baseY - 10}
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
function ClockTower({ x, height, fill, isNight, delay = 0, skipIntro }: {
  x: number; height: number; fill: string; isNight: boolean; delay?: number; skipIntro?: boolean;
}) {
  const baseWidth = 16;
  const baseY = 150 - height;

  return (
    <motion.g
      initial={skipIntro ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.2, delay, ease: 'easeOut' }}
    >
      {/* Tower body */}
      <rect x={x} y={baseY + 15} width={baseWidth} height={height - 15} fill={fill} />
      {/* Upper section (narrower) */}
      <rect x={x + 2} y={baseY + 8} width={baseWidth - 4} height={10} fill={fill} />
      {/* Pointed roof */}
      <polygon points={`${x + 2},${baseY + 8} ${x + baseWidth / 2},${baseY} ${x + baseWidth - 2},${baseY + 8}`} fill={fill} />
      {/* Clock face */}
      <circle cx={x + baseWidth / 2} cy={baseY + 22} r={5} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      {/* Clock hands */}
      <line x1={x + baseWidth / 2} y1={baseY + 22} x2={x + baseWidth / 2} y2={baseY + 18} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      <line x1={x + baseWidth / 2} y1={baseY + 22} x2={x + baseWidth / 2 + 3} y2={baseY + 22} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      {/* Clock glow at night */}
      {isNight && (
        <circle cx={x + baseWidth / 2} cy={baseY + 22} r={6} fill="#fbbf24" opacity={0.15} />
      )}
    </motion.g>
  );
}

// 🎨 Art Deco building (stepped/ziggurat top)
function ArtDecoBuilding({ x, width, height, fill, windowLit, windowDark, isNight, cleanliness, delay = 0, skipIntro }: {
  x: number; width: number; height: number; fill: string;
  windowLit: string; windowDark: string; isNight: boolean; cleanliness: number;
  delay?: number; skipIntro?: boolean;
}) {
  const baseY = 150 - height;
  const stepCount = 3;
  const stepHeight = 6;

  return (
    <motion.g
      initial={skipIntro ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.2, delay, ease: 'easeOut' }}
    >
      {/* Main body */}
      <rect x={x} y={baseY + stepCount * stepHeight} width={width} height={height - stepCount * stepHeight} fill={fill} />
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
          x1={x + 3 + i * 6} y1={baseY + stepCount * stepHeight}
          x2={x + 3 + i * 6} y2={150}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.5"
        />
      ))}
      {/* Art deco windows (taller, narrower) */}
      {Array.from({ length: Math.floor((height - stepCount * stepHeight) / 14) }).map((_, row) =>
        Array.from({ length: Math.floor(width / 10) }).map((_, col) => {
          const seed = (x * 11 + row * 23 + col * 13) % 100;
          const litProb = isNight ? (cleanliness > 0.7 ? 30 : 65) : 15;
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
        })
      )}
      {/* Pinnacle */}
      <line x1={x + width / 2} y1={baseY} x2={x + width / 2} y2={baseY - 6} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
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
  const palette = useCityPalette(props.cleanliness, props.isNight, props.synthwaveMode, props.isSnowing, props.timeOfDay);

  const buildings = useMemo(() => [
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
  ], []);

  return (
    <g opacity={0.5}>
      {buildings.map((b, i) => (
        <Building
          key={i}
          {...b}
          fill={palette.skylineFar}
          windowLit={palette.windowLit}
          windowDark={palette.windowDark}
          isNight={props.isNight}
          cleanliness={props.cleanliness}
          delay={i * 0.03}
          skipIntro={props.skipIntro}
        />
      ))}
      {/* Landmark: Church spire in far background */}
      <ChurchSpire x={155} height={85} fill={palette.skylineFar} isNight={props.isNight} delay={0.1} skipIntro={props.skipIntro} />
      {/* Landmark: Glass tower silhouette */}
      <GlassTower x={85} width={14} height={100} fill={palette.skylineFar} windowLit={palette.windowLit} isNight={props.isNight} cleanliness={props.cleanliness} delay={0.12} skipIntro={props.skipIntro} />
      {/* Snow layer */}
      {props.isSnowing && (
        <rect x={0} y={133} width={400} height={17} fill="white" fillOpacity={0.15} />
      )}
    </g>
  );
}

// Mid skyline
export function CityLandscapeMid(props: CityLandscapeProps) {
  const palette = useCityPalette(props.cleanliness, props.isNight, props.synthwaveMode, props.isSnowing, props.timeOfDay);

  const buildings = useMemo(() => [
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
  ], []);

  return (
    <g opacity={0.75}>
      {buildings.map((b, i) => (
        <Building
          key={i}
          {...b}
          fill={palette.skylineMid}
          windowLit={palette.windowLit}
          windowDark={palette.windowDark}
          isNight={props.isNight}
          cleanliness={props.cleanliness}
          delay={0.2 + i * 0.03}
          skipIntro={props.skipIntro}
        />
      ))}
    </g>
  );
}

// Near skyline (foreground buildings)
export function CityLandscapeFront(props: CityLandscapeProps) {
  const palette = useCityPalette(props.cleanliness, props.isNight, props.synthwaveMode, props.isSnowing, props.timeOfDay);

  const buildings = useMemo(() => [
    { x: 0, width: 40, height: 45 },
    { x: 55, width: 35, height: 55 },
    { x: 100, width: 45, height: 40 },
    { x: 155, width: 38, height: 50 },
    { x: 205, width: 42, height: 38 },
    { x: 258, width: 35, height: 48 },
    { x: 305, width: 40, height: 42 },
    { x: 355, width: 45, height: 50 },
  ], []);

  return (
    <>
      {buildings.map((b, i) => (
        <Building
          key={i}
          {...b}
          fill={palette.skylineNear}
          windowLit={palette.windowLit}
          windowDark={palette.windowDark}
          isNight={props.isNight}
          cleanliness={props.cleanliness}
          delay={0.4 + i * 0.03}
          skipIntro={props.skipIntro}
        />
      ))}

      {/* Road */}
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

// Urban tree (small, trimmed)
function UrbanTree({ x, y, scale = 1, isNight }: { x: number; y: number; scale?: number; isNight: boolean }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Trunk */}
      <rect x={-1} y={-12} width={2} height={12} fill={isNight ? '#1e293b' : '#78350f'} />
      {/* Canopy */}
      <circle cx={0} cy={-16} r={6} fill={isNight ? '#1e3a2a' : '#22c55e'} opacity={0.8} />
      <circle cx={-3} cy={-14} r={4} fill={isNight ? '#15302a' : '#16a34a'} opacity={0.7} />
      <circle cx={3} cy={-14} r={4} fill={isNight ? '#15302a' : '#16a34a'} opacity={0.7} />
    </g>
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
