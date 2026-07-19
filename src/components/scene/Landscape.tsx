import { useMemo, useState, useId } from 'react';
import { motion } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';

export type TimeOfDayLandscape = 'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'sunset' | 'dusk';

export interface LandscapeProps {
    cleanliness: number;
    isNight: boolean;
    synthwaveMode: boolean;
    isSnowing?: boolean;
    isChristmas?: boolean;
    skipIntro?: boolean;
    windSpeed?: number;
    timeOfDay?: TimeOfDayLandscape;
}

// Get current season based on month
function getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
    const month = new Date().getMonth(); // 0-11
    if (month >= 2 && month <= 4) return 'spring'; // Mar-May
    if (month >= 5 && month <= 7) return 'summer'; // Jun-Aug  
    if (month >= 8 && month <= 10) return 'autumn'; // Sep-Nov
    return 'winter'; // Dec-Feb
}

// 🌲 Stylized Pine Tree with Shading
function PineTree({ x, y, scale = 1, colorPrimary, colorShadow, isSnowing, isChristmas, windSpeed = 0 }: { x: number; y: number; scale?: number; colorPrimary: string; colorShadow: string; isSnowing?: boolean; isChristmas?: boolean; windSpeed?: number }) {
    const season = getCurrentSeason();

    // Seasonal color overrides
    const getSeasonalColors = () => {
        if (isChristmas || isSnowing) return { primary: colorPrimary, shadow: colorShadow };

        switch (season) {
            case 'spring':
                return { primary: '#86efac', shadow: '#4ade80' };
            case 'autumn':
                return { primary: '#fb923c', shadow: '#f97316' };
            default:
                return { primary: colorPrimary, shadow: colorShadow };
        }
    };

    const seasonalColors = getSeasonalColors();

    // Calculate sway animation based on wind speed
    const swayIntensity = Math.min(windSpeed / 30, 1); // Normalize 0-1
    const swayAmount = swayIntensity * 2; // Max 2 degrees
    const swayDuration = Math.max(1.5, 3 - (swayIntensity * 1.5)); // Faster in high wind

    // Randomize timing slightly per tree for natural effect
    const randomOffset = useMemo(() => Math.random() * 0.5, []);

    return (
        <g transform={`translate(${x}, ${y}) scale(${scale})`}>
            <motion.g
                animate={{
                    rotate: [0, swayAmount, 0, -swayAmount, 0],
                }}
                transition={{
                    duration: swayDuration,
                    repeat: Infinity,
                    ease: 'easeInOut' as const,
                    delay: randomOffset,
                }}
                style={{ transformOrigin: 'center bottom' }}
            >
                {/* Trunk - slightly rounded base */}
                <path d="M-2,-8 L2,-8 L2,10 Q0,11 -2,10 Z" fill="rgba(60, 40, 20, 0.85)" />

                {/* Bottom Tier - fluffy */}
                <path d="M0,-22 Q8,-18 14,-6 Q4,-8 0,-8" fill={seasonalColors.shadow} />
                <path d="M0,-22 Q-8,-18 -14,-6 Q-4,-8 0,-8" fill={seasonalColors.primary} />

                {/* Middle Tier - fluffy */}
                <path d="M0,-36 Q6,-32 11,-16 Q4,-18 0,-18" fill={seasonalColors.shadow} />
                <path d="M0,-36 Q-6,-32 -11,-16 Q-4,-18 0,-18" fill={seasonalColors.primary} />

                {/* Top Tier - fluffy */}
                <path d="M0,-48 Q4,-42 8,-30 Q3,-32 0,-32" fill={seasonalColors.shadow} />
                <path d="M0,-48 Q-4,-42 -8,-30 Q-3,-32 0,-32" fill={seasonalColors.primary} />

                {/* Spring Blossoms 🌸 */}
                {season === 'spring' && !isChristmas && (
                    <g>
                        <circle cx="-8" cy="-15" r="1.2" fill="#fda4af" opacity="0.9" />
                        <circle cx="6" cy="-22" r="1.2" fill="#fda4af" opacity="0.9" />
                        <circle cx="-4" cy="-30" r="1.2" fill="#fda4af" opacity="0.9" />
                        <circle cx="7" cy="-38" r="1.2" fill="#fda4af" opacity="0.9" />
                    </g>
                )}

                {/* Christmas Decorations 🎄 */}
                {isChristmas && (
                    <g>
                        {/* Baubles */}
                        <circle cx="-6" cy="-12" r="1.5" fill="#ef4444" /> {/* Red */}
                        <circle cx="5" cy="-18" r="1.5" fill="#fbbf24" /> {/* Gold */}
                        <circle cx="0" cy="-28" r="1.5" fill="#3b82f6" /> {/* Blue */}
                        <circle cx="-3" cy="-38" r="1.5" fill="#ef4444" /> {/* Red */}
                        {/* Star on top */}
                        <circle cx="0" cy="-50" r="2" fill="#fbbf24" filter="drop-shadow(0 0 2px #fcd34d)" />
                    </g>
                )}

                {/* Snow cap on top (if snowing) */}
                {isSnowing && (
                    <path d="M0,-50 L4,-42 L-4,-42 Z" fill="#ffffff" opacity="0.9" />
                )}
            </motion.g>
        </g>
    );
}

// ⛰️ Rolling Hill Layer (Generic)
function HillLayer({
    d,
    fill,
    trees = [],
    treeColors,
    delay = 0,
    isSnowing,
    isChristmas,
    skipIntro,
    windSpeed = 0
}: {
    d: string;
    fill: string;
    trees?: { x: number, y: number, scale: number }[];
    treeColors?: { primary: string, shadow: string };
    delay?: number;
    isSnowing?: boolean;
    isChristmas?: boolean;
    skipIntro?: boolean;
    windSpeed?: number;
}) {
    return (
        <motion.g
            initial={skipIntro ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={skipIntro ? { duration: 0 } : { duration: 1.5, delay, ease: 'easeOut' as const }}
        >
            <path
                d={d}
                fill={fill}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1.5"
                strokeLinecap="round"
            />

            {/* Snow layer on top of hill curve if snowing */}
            {isSnowing && (
                <path d={d} fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="10 20" />
            )}

            {trees.map((tree, i) => (
                <PineTree
                    key={i}
                    x={tree.x}
                    y={tree.y}
                    scale={tree.scale}
                    colorPrimary={treeColors?.primary || '#4ade80'}
                    colorShadow={treeColors?.shadow || '#22c55e'}
                    isSnowing={isSnowing}
                    isChristmas={isChristmas}
                    windSpeed={windSpeed}
                />
            ))}
        </motion.g>
    );
}

// 🎨 Palette Hook
function useLandscapePalette(cleanliness: number, isNight: boolean, synthwaveMode: boolean, isSnowing?: boolean, timeOfDay?: TimeOfDayLandscape) {
    return useMemo(() => {
        if (synthwaveMode) {
            return {
                backHillHighlight: '#3c096c', backHillShadow: '#1a0033',
                midHillHighlight: '#5a189a', midHillShadow: '#240046',
                frontHillHighlight: '#7b2cbf', frontHillShadow: '#3c096c',
                treePrimary: '#e0aaff', treeShadow: '#9d4edd',
            };
        }
        if (isSnowing) {
            return {
                backHillHighlight: isNight ? '#2d3748' : '#e2e8f0', backHillShadow: isNight ? '#0f172a' : '#cbd5e1',
                midHillHighlight: isNight ? '#334155' : '#f1f5f9', midHillShadow: isNight ? '#1e293b' : '#e2e8f0',
                frontHillHighlight: isNight ? '#475569' : '#ffffff', frontHillShadow: isNight ? '#334155' : '#f1f5f9',
                treePrimary: isNight ? '#0f172a' : '#14532d',
                treeShadow: isNight ? '#020617' : '#052e16',
            };
        }
        if (isNight) {
            return {
                backHillHighlight: '#1e293b', backHillShadow: '#020617',
                midHillHighlight: '#334155', midHillShadow: '#0f172a',
                frontHillHighlight: '#475569', frontHillShadow: '#1e293b',
                treePrimary: '#475569', treeShadow: '#0f172a',
            };
        }

        const isClean = cleanliness > 0.5;

        // Time-of-day tinting for landscape
        if (timeOfDay === 'dawn') {
            return {
                backHillHighlight: isClean ? '#2b5a3e' : '#5c3e1a', backHillShadow: isClean ? '#13281a' : '#2b1a08',
                midHillHighlight: isClean ? '#34704b' : '#734e26', midHillShadow: isClean ? '#1a3d25' : '#3d250f',
                frontHillHighlight: isClean ? '#3e8c5b' : '#8c5e32', frontHillShadow: isClean ? '#204d30' : '#4d3215',
                treePrimary: isClean ? '#6ec89b' : '#b8860b',
                treeShadow: isClean ? '#3a8a65' : '#8b6914',
            };
        }
        if (timeOfDay === 'sunset') {
            return {
                backHillHighlight: isClean ? '#4a702e' : '#733e0d', backHillShadow: isClean ? '#203610' : '#381c03',
                midHillHighlight: isClean ? '#5c8a39' : '#8c4e12', midHillShadow: isClean ? '#2a4714' : '#4c2505',
                frontHillHighlight: isClean ? '#70a644' : '#a65f1a', frontHillShadow: isClean ? '#365a18' : '#5c3209',
                treePrimary: isClean ? '#8bc34a' : '#cd853f',
                treeShadow: isClean ? '#558b2f' : '#a0522d',
            };
        }
        if (timeOfDay === 'dusk') {
            return {
                backHillHighlight: isClean ? '#25354c' : '#3d281a', backHillShadow: isClean ? '#0f1824' : '#1f130a',
                midHillHighlight: isClean ? '#324a6b' : '#543b27', midHillShadow: isClean ? '#172538' : '#2a1a0f',
                frontHillHighlight: isClean ? '#44608c' : '#6b4e36', frontHillShadow: isClean ? '#21334c' : '#3a2818',
                treePrimary: isClean ? '#5a7a90' : '#7a6040',
                treeShadow: isClean ? '#2a4a60' : '#5a4030',
            };
        }

        // Midday / Normal daylight
        return {
            backHillHighlight: isClean ? '#1f6e3c' : '#61330b', backHillShadow: isClean ? '#0e3a1d' : '#2d1402',
            midHillHighlight: isClean ? '#22c55e' : '#854d0e', midHillShadow: isClean ? '#14532d' : '#451a03',
            frontHillHighlight: isClean ? '#4ade80' : '#a16207', frontHillShadow: isClean ? '#16a34a' : '#713f12',
            treePrimary: isClean ? '#4ade80' : '#a16207',
            treeShadow: isClean ? '#16a34a' : '#854d0e',
        };
    }, [cleanliness, isNight, synthwaveMode, isSnowing, timeOfDay]);
}

// --- Independent Layer Components ---

export function LandscapeBack(props: LandscapeProps) {
    const palette = useLandscapePalette(props.cleanliness, props.isNight, props.synthwaveMode, props.isSnowing, props.timeOfDay);
    const id = useId();

    // Explicit tree placements on the new curve to stay grounded
    // Ridge samples: (40,84) (80,76) (150,81) (220,107) (290,116) (360,100)
    // Anchor sits +4 below ridge so trunk base (y+6*scale) sinks slightly into the hill
    // and foliage doesn't hover — prevents "floating tree" on tall viewports.
    const backTrees = [
        { x: 40, y: 88, scale: 0.3 },
        { x: 80, y: 80, scale: 0.3 },
        { x: 150, y: 85, scale: 0.3 },
        { x: 220, y: 111, scale: 0.3 },
        { x: 290, y: 120, scale: 0.3 },
        { x: 360, y: 104, scale: 0.3 },
    ];

    return (
        <>
            <defs>
                <linearGradient id={`${id}-gradBack`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.backHillHighlight} />
                    <stop offset="100%" stopColor={palette.backHillShadow} />
                </linearGradient>
            </defs>
            <HillLayer
                d="M0,150 L0,100 Q100,50 200,100 Q300,140 400,80 L400,150 Z"
                fill={`url(#${id}-gradBack)`}
                trees={backTrees}
                treeColors={{ primary: palette.treePrimary, shadow: palette.treeShadow }}
                delay={0}
                isSnowing={props.isSnowing}
                isChristmas={props.isChristmas}
                skipIntro={props.skipIntro}
                windSpeed={props.windSpeed}
            />
        </>
    );
}

export function LandscapeMid(props: LandscapeProps) {
    const palette = useLandscapePalette(props.cleanliness, props.isNight, props.synthwaveMode, props.isSnowing, props.timeOfDay);
    const id = useId();

    // Trees positioned so trunk base sits just into the mid hill ridge.
    // Ridge curve: M0,120 Q80,140 160,100 Q240,60 320,110 Q360,130 400,100
    const midTrees = [
        { x: 45, y: 119, scale: 0.45 },   // ridge ≈127
        { x: 120, y: 110, scale: 0.45 },  // ridge ≈118
        { x: 190, y: 81, scale: 0.45 },   // ridge ≈88
        { x: 260, y: 78, scale: 0.45 },   // ridge ≈85
        { x: 330, y: 107, scale: 0.45 },  // ridge ≈114
    ];

    return (
        <>
            <defs>
                <linearGradient id={`${id}-gradMid`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.midHillHighlight} />
                    <stop offset="100%" stopColor={palette.midHillShadow} />
                </linearGradient>
            </defs>
            <HillLayer
                d="M0,150 L0,120 Q80,140 160,100 Q240,60 320,110 Q360,130 400,100 L400,150 Z"
                fill={`url(#${id}-gradMid)`}
                trees={midTrees}
                treeColors={{ primary: palette.treePrimary, shadow: palette.treeShadow }}
                delay={0.2}
                isSnowing={props.isSnowing}
                isChristmas={props.isChristmas}
                skipIntro={props.skipIntro}
                windSpeed={props.windSpeed}
            />
        </>
    );
}

function Cottage({ x, y, scale = 1, isNight }: { x: number; y: number; scale?: number; isNight: boolean }) {
  const [windowLit, setWindowLit] = useState(isNight);
  const { impactLight } = useHaptics();

  // Keep window in sync with isNight unless clicked
  useMemo(() => {
    setWindowLit(isNight);
  }, [isNight]);

  const handleClick = () => {
    setWindowLit(!windowLit);
    impactLight();
  };

  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale})`}
      className="cursor-pointer pointer-events-auto"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Countryside cottage - click to toggle lights"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {/* 1. Ground Drop Shadow (Ambient Occlusion) */}
      <ellipse cx="0" cy="3" rx="14" ry="2.5" fill="rgba(15, 23, 42, 0.35)" />

      {/* 2. Stone Retaining Foundation (Grounds the house into the sloped hill) */}
      {/* It extends down to y=7 on the right to fill the gap on the sloped hillside */}
      <path d="M-10.5,1 L10.5,1 L10.5,7 L-10.5,4 Z" fill="#4b5563" stroke="#27272a" strokeWidth="0.5" />
      
      {/* Foundation details (individual stone blocks) */}
      <line x1="-5" y1="1" x2="-5" y2="5" stroke="#3f3f46" strokeWidth="0.5" />
      <line x1="5" y1="1" x2="5" y2="6" stroke="#3f3f46" strokeWidth="0.5" />
      <line x1="-10.5" y1="3" x2="10.5" y2="3.5" stroke="#3f3f46" strokeWidth="0.5" />

      {/* 3. Winding Pathway leading from the door */}
      <path
        d="M-1.5,1 Q-2,5 -5,8 Q-8,11 -6,14 L-2,14 Q-4,11 -1,8 Q0,5 1.5,1 Z"
        fill="rgba(115, 115, 115, 0.4)"
        opacity="0.8"
      />
      {/* Pathway pebbles */}
      <circle cx="-3" cy="6" r="0.6" fill="#888" opacity="0.6" />
      <circle cx="-5" cy="10" r="0.5" fill="#aaa" opacity="0.6" />
      <circle cx="-4" cy="12" r="0.7" fill="#777" opacity="0.6" />

      {/* 4. Main House Structure */}
      {/* Stone walls */}
      <rect x="-10" y="-8" width="20" height="9" fill="#e4e4e7" stroke="#71717a" strokeWidth="0.5" rx="0.5" />
      
      {/* Timber accents / framing */}
      <line x1="-10" y1="-4" x2="10" y2="-4" stroke="#7f1d1d" strokeWidth="0.5" opacity="0.3" />

      {/* Door */}
      <rect x="-2" y="-4" width="4" height="5" fill="#78350f" rx="0.2" />
      <circle cx="-1" cy="-1.5" r="0.2" fill="#fbbf24" />

      {/* Roof */}
      <polygon points="-12,-8 0,-16 12,-8" fill="#450a0a" stroke="#7f1d1d" strokeWidth="0.5" />
      
      {/* Tiny solar panels on the roof */}
      <polygon points="-9,-10 0,-14 -1,-11 -8,-8" fill="#1e1b4b" opacity="0.8" />
      <line x1="-9" y1="-10" x2="-8" y2="-8" stroke="#38bdf8" strokeWidth="0.3" opacity="0.5" />
      
      {/* Chimney */}
      <rect x="6" y="-14" width="3" height="6" fill="#3f3f46" rx="0.2" />
      
      {/* Windows with night glow */}
      <rect x="-7" y="-5" width="3" height="3" fill={windowLit ? "#fbbf24" : "#93c5fd"} rx="0.5" stroke="#4b5563" strokeWidth="0.3" />
      <rect x="4" y="-5" width="3" height="3" fill={windowLit ? "#fbbf24" : "#93c5fd"} rx="0.5" stroke="#4b5563" strokeWidth="0.3" />
      
      {/* Ambient window glow cast onto walls/ground */}
      {windowLit && (
        <>
          <circle cx="-5.5" cy="-3.5" r="2.5" fill="#fbbf24" opacity="0.3" filter="blur(1px)" />
          <circle cx="5.5" cy="-3.5" r="2.5" fill="#fbbf24" opacity="0.3" filter="blur(1px)" />
          <polygon points="-7,-2 -10,3 -4,3" fill="#fbbf24" opacity="0.15" filter="blur(1px)" />
          <polygon points="4,-2 1,3 7,3" fill="#fbbf24" opacity="0.15" filter="blur(1px)" />
        </>
      )}

      {/* 5. Flanking Shrubbery (Blends house corners organically into hill) */}
      {/* Left Shrub */}
      <g transform="translate(-11, 1) scale(0.8)">
        <circle cx="-2" cy="-1" r="3.5" fill="#15803d" />
        <circle cx="1" cy="-2" r="3" fill="#166534" />
        <circle cx="0" cy="1" r="3.2" fill="#14532d" />
      </g>
      {/* Right Shrub */}
      <g transform="translate(11, 2) scale(0.7)">
        <circle cx="-1" cy="-2" r="3" fill="#166534" />
        <circle cx="2" cy="-1" r="3.5" fill="#15803d" />
        <circle cx="0" cy="1" r="3.2" fill="#14532d" />
      </g>
    </g>
  );
}

export function LandscapeFront(props: LandscapeProps) {
    const palette = useLandscapePalette(props.cleanliness, props.isNight, props.synthwaveMode, props.isSnowing, props.timeOfDay);
    const id = useId();

    const frontTrees = [
        { x: 40, y: 130, scale: 0.6 },
        { x: 90, y: 122, scale: 0.6 },
        { x: 370, y: 130, scale: 0.6 }
    ];

    return (
        <>
            <defs>
                <linearGradient id={`${id}-gradFront`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.frontHillHighlight} />
                    <stop offset="100%" stopColor={palette.frontHillShadow} />
                </linearGradient>
            </defs>
            <HillLayer
                d="M0,150 L0,135 Q120,100 200,135 Q280,180 400,120 L400,150 Z"
                fill={`url(#${id}-gradFront)`}
                trees={frontTrees}
                treeColors={{ primary: palette.treePrimary, shadow: palette.treeShadow }}
                delay={0.4}
                isSnowing={props.isSnowing}
                isChristmas={props.isChristmas}
                skipIntro={props.skipIntro}
                windSpeed={props.windSpeed}
            />
            {/* Countryside Cottage */}
            <Cottage x={210} y={135} scale={0.9} isNight={props.isNight} />

            {/* Ground strip at the very bottom for visible earth */}
            <rect x={0} y={145} width={400} height={5} fill={palette.frontHillShadow} />
            <rect x={0} y={148} width={400} height={2} fill="rgba(0,0,0,0.15)" />
        </>
    );
}

// Deprecated Monolith - Keeping for compatibility if needed, but Index.tsx should use layers
export function Landscape(props: LandscapeProps) {
    return (
        <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none z-0">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
                <LandscapeBack {...props} />
                <LandscapeMid {...props} />
                <LandscapeFront {...props} />
            </svg>
        </div>
    );
}
