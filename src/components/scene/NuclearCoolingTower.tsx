import { motion } from 'framer-motion';

interface NuclearCoolingTowerProps {
    x: number; // X position (0-400 in SVG viewBox)
    steamIntensity?: number; // 0-1, how much steam to show
    isNight?: boolean;
}

export function NuclearCoolingTower({ x, steamIntensity = 0.7, isNight }: NuclearCoolingTowerProps) {
    // Grounded at Y=110 (midground layer)
    const baseY = 110;

    return (
        <motion.g
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.8 }}
        >
            {/* Hyperboloid cooling tower structure */}
            <g transform={`translate(${x}, ${baseY})`}>
                {/* Tower body - hyperboloid shape */}
                <defs>
                    <linearGradient id={`towerGrad${x}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.9" />
                        <stop offset="50%" stopColor="#f1f5f9" />
                        <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.9" />
                    </linearGradient>

                    {/* Steam gradient - purple/cyan tint for nuclear */}
                    <linearGradient id={`steamGrad${x}`} x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#c4b5fd" stopOpacity={steamIntensity * 0.6} />
                        <stop offset="50%" stopColor="#a5b4fc" stopOpacity={steamIntensity * 0.4} />
                        <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Base shadow */}
                <ellipse
                    cx="0"
                    cy="2"
                    rx="12"
                    ry="3"
                    fill="rgba(0,0,0,0.2)"
                />

                {/* Tower structure - hyperboloid (wider at top and bottom, narrower in middle) */}
                <path
                    d="M-10,0 Q-6,-15 -8,-30 L8,-30 Q6,-15 10,0 Z"
                    fill={`url(#towerGrad${x})`}
                    stroke="#94a3b8"
                    strokeWidth="0.5"
                />

                {/* Concrete base/foundation to ground the tower */}
                <rect
                    x="-11"
                    y="0"
                    width="22"
                    height="6"
                    fill="#94a3b8"
                    stroke="#64748b"
                    strokeWidth="0.5"
                />

                {/* Horizontal bands for detail */}
                <line x1="-9" y1="-8" x2="9" y2="-8" stroke="#94a3b8" strokeWidth="0.5" opacity="0.3" />
                <line x1="-7" y1="-18" x2="7" y2="-18" stroke="#94a3b8" strokeWidth="0.5" opacity="0.3" />

                {/* Nuclear glow at base (subtle blue-purple) */}
                {isNight && (
                    <motion.ellipse
                        cx="0"
                        cy="-5"
                        rx="6"
                        ry="2"
                        fill="#818cf8"
                        opacity="0.3"
                        animate={{ opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                )}

                {/* Rising steam particles */}
                {[...Array(4)].map((_, i) => (
                    <motion.circle
                        key={i}
                        cx={-3 + i * 2}
                        cy={-30}
                        r={2 + i * 0.5}
                        fill={`url(#steamGrad${x})`}
                        initial={{ y: 0, opacity: steamIntensity }}
                        animate={{
                            y: [-5, -25],
                            opacity: [steamIntensity * 0.6, 0],
                            scale: [1, 1.8],
                        }}
                        transition={{
                            duration: 3 + i * 0.5,
                            delay: i * 0.7,
                            repeat: Infinity,
                            ease: 'easeOut',
                        }}
                    />
                ))}
            </g>
        </motion.g>
    );
}
