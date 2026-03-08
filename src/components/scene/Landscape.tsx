import { useMemo } from 'react';
import { motion } from 'framer-motion';

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
        <motion.g
            transform={`translate(${x}, ${y}) scale(${scale})`}
            animate={{
                rotate: [0, swayAmount, 0, -swayAmount, 0],
            }}
            transition={{
                duration: swayDuration,
                repeat: Infinity,
                ease: "easeInOut",
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
            transition={skipIntro ? { duration: 0 } : { duration: 1.5, delay, ease: "easeOut" }}
        >
            <path
                d={d}
                fill={fill}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="2"
                strokeLinecap="round"
            />

            {/* Snow layer on top of hill curve if snowing */}
            {isSnowing && (
                <path d={d} fill="white" fillOpacity="0.3" stroke="white" strokeWidth="2" strokeOpacity="0.5" strokeDasharray="10 20" />
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
                backHill: '#240046', midHill: '#3c096c', frontHill: '#5a189a',
                treePrimary: '#e0aaff', treeShadow: '#9d4edd',
            };
        }
        if (isSnowing) {
            return {
                backHill: isNight ? '#1e293b' : '#cbd5e1',
                midHill: isNight ? '#334155' : '#e2e8f0',
                frontHill: isNight ? '#475569' : '#f1f5f9',
                treePrimary: isNight ? '#0f172a' : '#14532d',
                treeShadow: isNight ? '#020617' : '#052e16',
            };
        }
        if (isNight) {
            return {
                backHill: '#0f172a', midHill: '#1e293b', frontHill: '#334155',
                treePrimary: '#475569', treeShadow: '#0f172a',
            };
        }

        const isClean = cleanliness > 0.5;

        // Time-of-day tinting for landscape
        if (timeOfDay === 'dawn') {
            return {
                backHill: isClean ? '#1a3a2a' : '#3d2810',
                midHill: isClean ? '#1f4d35' : '#5c3a18',
                frontHill: isClean ? '#2a6040' : '#6d4520',
                treePrimary: isClean ? '#6ec89b' : '#b8860b',
                treeShadow: isClean ? '#3a8a65' : '#8b6914',
            };
        }
        if (timeOfDay === 'sunset') {
            return {
                backHill: isClean ? '#2d4a1a' : '#4a2a08',
                midHill: isClean ? '#3a5c22' : '#6b3d10',
                frontHill: isClean ? '#4a6e2a' : '#7d4e18',
                treePrimary: isClean ? '#8bc34a' : '#cd853f',
                treeShadow: isClean ? '#558b2f' : '#a0522d',
            };
        }
        if (timeOfDay === 'dusk') {
            return {
                backHill: isClean ? '#152030' : '#2a1a10',
                midHill: isClean ? '#1e2d40' : '#3a2818',
                frontHill: isClean ? '#283a50' : '#4a3520',
                treePrimary: isClean ? '#5a7a90' : '#7a6040',
                treeShadow: isClean ? '#2a4a60' : '#5a4030',
            };
        }

        return {
            backHill: isClean ? '#14532d' : '#422006',
            midHill: isClean ? '#166534' : '#713f12',
            frontHill: isClean ? '#15803d' : '#854d0e',
            treePrimary: isClean ? '#4ade80' : '#a16207',
            treeShadow: isClean ? '#16a34a' : '#854d0e',
        };
    }, [cleanliness, isNight, synthwaveMode, isSnowing, timeOfDay]);
}

// --- Independent Layer Components ---

export function LandscapeBack(props: LandscapeProps) {
    const palette = useLandscapePalette(props.cleanliness, props.isNight, props.synthwaveMode, props.isSnowing, props.timeOfDay);

    // Explicit tree placements on the new curve to stay grounded
    const backTrees = [
        { x: 40, y: 95, scale: 0.6 },
        { x: 80, y: 76, scale: 0.6 },
        { x: 150, y: 81, scale: 0.6 },
        { x: 220, y: 107, scale: 0.6 },
        { x: 290, y: 116, scale: 0.6 },
        { x: 360, y: 100, scale: 0.6 }
    ];

    return (
        <>
            <defs>
                <linearGradient id="gradBack" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.backHill} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={palette.backHill} />
                </linearGradient>
            </defs>
            <HillLayer
                d="M0,150 L0,100 Q100,50 200,100 Q300,140 400,80 L400,150 Z"
                fill="url(#gradBack)"
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

    const midTrees = [
        { x: 45, y: 126, scale: 0.9 },
        { x: 120, y: 116, scale: 0.9 },
        { x: 190, y: 88, scale: 0.9 },
        { x: 260, y: 85, scale: 0.9 },
        { x: 330, y: 112, scale: 0.9 }
    ];

    return (
        <>
            <defs>
                <linearGradient id="gradMid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.midHill} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={palette.midHill} />
                </linearGradient>
            </defs>
            <HillLayer
                d="M0,150 L0,120 Q80,140 160,100 Q240,60 320,110 Q360,130 400,100 L400,150 Z"
                fill="url(#gradMid)"
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

export function LandscapeFront(props: LandscapeProps) {
    const palette = useLandscapePalette(props.cleanliness, props.isNight, props.synthwaveMode, props.isSnowing, props.timeOfDay);

    const frontTrees = [
        { x: 40, y: 130, scale: 1.2 },
        { x: 90, y: 122, scale: 1.2 },
        { x: 370, y: 130, scale: 1.2 }
    ];

    return (
        <>
            <defs>
                <linearGradient id="gradFront" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.frontHill} stopOpacity="1" />
                    <stop offset="100%" stopColor={palette.frontHill} />
                </linearGradient>
            </defs>
            <HillLayer
                d="M0,150 L0,135 Q120,100 200,135 Q280,180 400,120 L400,150 Z"
                fill="url(#gradFront)"
                trees={frontTrees}
                treeColors={{ primary: palette.treePrimary, shadow: palette.treeShadow }}
                delay={0.4}
                isSnowing={props.isSnowing}
                isChristmas={props.isChristmas}
                skipIntro={props.skipIntro}
                windSpeed={props.windSpeed}
            />
            {/* Ground strip at the very bottom for visible earth */}
            <rect x={0} y={145} width={400} height={5} fill={palette.frontHill} />
            <rect x={0} y={148} width={400} height={2} fill="rgba(0,0,0,0.1)" />
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
