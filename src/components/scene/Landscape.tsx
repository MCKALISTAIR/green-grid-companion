import { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface LandscapeProps {
    cleanliness: number;
    isNight: boolean;
    synthwaveMode: boolean;
    isSnowing?: boolean;
    isChristmas?: boolean;
    skipIntro?: boolean;
    windSpeed?: number;
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
    const randomOffset = Math.random() * 0.5;

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
            {/* Trunk */}
            <rect x="-2" y="-8" width="4" height="18" fill="rgba(60, 40, 20, 0.4)" />

            {/* Bottom Tier */}
            <path d="M0,-25 L15,-5 L0,-5 Z" fill={seasonalColors.shadow} />
            <path d="M0,-25 L-15,-5 L0,-5 Z" fill={seasonalColors.primary} />

            {/* Middle Tier */}
            <path d="M0,-40 L12,-20 L0,-20 Z" fill={seasonalColors.shadow} />
            <path d="M0,-40 L-12,-20 L0,-20 Z" fill={seasonalColors.primary} />

            {/* Top Tier */}
            <path d="M0,-50 L8,-35 L0,-35 Z" fill={seasonalColors.shadow} />
            <path d="M0,-50 L-8,-35 L0,-35 Z" fill={seasonalColors.primary} />

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
            <path d={d} fill={fill} />

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
// eslint-disable-next-line react-refresh/only-export-components
export function useLandscapePalette(cleanliness: number, isNight: boolean, synthwaveMode: boolean, isSnowing?: boolean) {
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
        return {
            backHill: isClean ? '#14532d' : '#422006',
            midHill: isClean ? '#166534' : '#713f12',
            frontHill: isClean ? '#15803d' : '#854d0e',
            treePrimary: isClean ? '#4ade80' : '#a16207',
            treeShadow: isClean ? '#16a34a' : '#854d0e',
        };
    }, [cleanliness, isNight, synthwaveMode, isSnowing]);
}

// --- Independent Layer Components ---

export function LandscapeBack(props: LandscapeProps) {
    const palette = useLandscapePalette(props.cleanliness, props.isNight, props.synthwaveMode, props.isSnowing);
    // 0,80 -> 200,80 via 100,20 | 200,80 -> 400,60 via 300,140
    const getBackY = (x: number) => (x < 200 ? 80 + (x / 200) * 20 : 80);
    const backTrees = [20, 80, 150, 220, 290, 360].map(x => ({ x, y: 85, scale: 0.6 }));

    return (
        <>
            <defs>
                <linearGradient id="gradBack" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.backHill} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={palette.backHill} />
                </linearGradient>
            </defs>
            <HillLayer
                d="M0,150 L0,80 Q100,20 200,80 Q300,140 400,60 L400,150 Z"
                fill="url(#gradBack)"
                trees={backTrees.map(t => ({ ...t, y: getBackY(t.x) }))}
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
    const palette = useLandscapePalette(props.cleanliness, props.isNight, props.synthwaveMode, props.isSnowing);
    const midTrees = [45, 120, 190, 260, 330].map(x => ({ x, y: 105, scale: 0.9 }));

    return (
        <>
            <defs>
                <linearGradient id="gradMid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.midHill} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={palette.midHill} />
                </linearGradient>
            </defs>
            <HillLayer
                d="M0,150 L0,110 Q80,140 160,90 Q240,40 320,100 Q360,130 400,90 L400,150 Z"
                fill="url(#gradMid)"
                trees={midTrees.map(t => ({ ...t, y: 100 }))}
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
    const palette = useLandscapePalette(props.cleanliness, props.isNight, props.synthwaveMode, props.isSnowing);
    const frontTrees = [10, 90, 310, 390].map(x => ({ x, y: 130, scale: 1.2 }));

    return (
        <>
            <defs>
                <linearGradient id="gradFront" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.frontHill} stopOpacity="1" />
                    <stop offset="100%" stopColor={palette.frontHill} />
                </linearGradient>
            </defs>
            <HillLayer
                d="M0,150 L0,130 Q120,80 200,130 Q280,180 400,110 L400,150 Z"
                fill="url(#gradFront)"
                trees={frontTrees.map(t => ({ ...t, y: 140 }))}
                treeColors={{ primary: palette.treePrimary, shadow: palette.treeShadow }}
                delay={0.4}
                isSnowing={props.isSnowing}
                isChristmas={props.isChristmas}
                skipIntro={props.skipIntro}
                windSpeed={props.windSpeed}
            />
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
