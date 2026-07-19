import { motion } from 'framer-motion';

interface HydroDamProps {
    flowIntensity: number; // 0-1, based on hydro % + rain
}

export function HydroDam({ flowIntensity }: HydroDamProps) {
    // Grounded at Y=120-150 (front corner)
    // Shows when hydro > 10% AND raining

    return (
        <g transform="translate(30, 120)">
            <motion.g
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 1 }}
            >
                {/* Dam structure */}
                <path
                    d="M0,0 L0,30 L20,30 L25,0 Z"
                    fill="#64748b"
                    opacity="0.8"
                />

                {/* Dam face detail */}
                <rect x="2" y="5" width="20" height="1" fill="#475569" opacity="0.6" />
                <rect x="2" y="12" width="20" height="1" fill="#475569" opacity="0.6" />
                <rect x="2" y="19" width="20" height="1" fill="#475569" opacity="0.6" />

                {/* Water surface behind dam */}
                <motion.rect
                    x="-15"
                    y="8"
                    width="15"
                    height="8"
                    fill="#3b82f6"
                    opacity="0.5"
                    animate={{
                        y: [8, 7, 8],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut' as const,
                    }}
                />

                {/* Waterfall streams */}
                {Array.from({ length: 3 }).map((_, i) => (
                    <motion.path
                        key={i}
                        d={`M${22 + i * 2},15 L${23 + i * 2},30`}
                        stroke="#60a5fa"
                        strokeWidth={1.5 + flowIntensity}
                        opacity={0.6 + flowIntensity * 0.3}
                        animate={{
                            strokeDashoffset: [0, -20],
                        }}
                        strokeDasharray="4 2"
                        transition={{
                            duration: 0.8 + i * 0.2,
                            repeat: Infinity,
                            ease: 'linear' as const,
                        }}
                    />
                ))}

                {/* Splash at bottom */}
                <motion.ellipse
                    cx="24"
                    cy="30"
                    rx={4 + flowIntensity * 2}
                    ry="2"
                    fill="white"
                    opacity="0.4"
                    animate={{
                        opacity: [0.2, 0.5, 0.2],
                        rx: [4 + flowIntensity * 2, 5 + flowIntensity * 2, 4 + flowIntensity * 2],
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'easeInOut' as const,
                    }}
                />
            </motion.g>
        </g>
    );
}
