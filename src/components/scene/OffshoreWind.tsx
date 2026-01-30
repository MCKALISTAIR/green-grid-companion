import { motion } from 'framer-motion';
import { useId } from 'react';

interface OffshoreWindProps {
    count?: number; // How many turbines to show
    windSpeed?: number; // Affects rotation speed
}

export function OffshoreWind({ count = 3, windSpeed = 10 }: OffshoreWindProps) {
    const id = useId();

    // Grounded at Y=60 (background/horizon layer)
    const baseY = 60;

    // Calculate turbine speed based on wind
    const rotationSpeed = Math.max(6, 12 - (windSpeed / 5));

    return (
        <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }} // Distant, so lower opacity
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
        >
            {/* Offshore turbines spread across horizon */}
            {Array.from({ length: count }).map((_, i) => {
                const x = 80 + i * 100; // Spread across background
                const scale = 0.25 + i * 0.05; // Slight size variation for depth

                return (
                    <g key={i} transform={`translate(${x}, ${baseY}) scale(${scale})`}>
                        {/* Tower - very simplified for distance */}
                        <line
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="-25"
                            stroke="#94a3b8"
                            strokeWidth="2"
                            opacity="0.6"
                        />

                        {/* Hub */}
                        <circle
                            cx="0"
                            cy="-25"
                            r="2"
                            fill="#cbd5e1"
                            opacity="0.7"
                        />

                        {/* Rotating blades */}
                        <g>
                            <animateTransform
                                attributeName="transform"
                                attributeType="XML"
                                type="rotate"
                                from="0 0 -25"
                                to="360 0 -25"
                                dur={`${rotationSpeed}s`}
                                repeatCount="indefinite"
                            />

                            {/* Three blades */}
                            {[0, 120, 240].map((angle) => (
                                <path
                                    key={angle}
                                    d="M0,-25 L-1,-32 L0,-40 L1,-32 Z"
                                    fill="#e2e8f0"
                                    opacity="0.6"
                                    transform={`rotate(${angle} 0 -25)`}
                                />
                            ))}
                        </g>
                    </g>
                );
            })}
        </motion.g>
    );
}
