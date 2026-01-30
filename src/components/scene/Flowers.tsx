import { motion } from 'framer-motion';

interface FlowersProps {
    positions: { x: number; y: number }[]; // SVG coordinates for flower positions
}

export function Flowers({ positions }: FlowersProps) {
    // Flowers for bees to visit
    // Grounded at landscape level

    const flowerColors = ['#ec4899', '#f472b6', '#fb7185', '#fbbf24', '#a855f7'];

    return (
        <g>
            {positions.map((pos, i) => {
                const color = flowerColors[i % flowerColors.length];

                return (
                    <motion.g
                        key={i}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.2, duration: 0.5 }}
                    >
                        {/* Stem */}
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#16a34a" strokeWidth="1" />

                        {/* Petals - smaller for better proportions */}
                        {[0, 72, 144, 216, 288].map((angle) => (
                            <motion.ellipse
                                key={angle}
                                cx="0"
                                cy="-2"
                                rx="1.5"
                                ry="2"
                                fill={color}
                                opacity="0.9"
                                transform={`rotate(${angle})`}
                                animate={{
                                    scale: [1, 1.05, 1],
                                }}
                                transition={{
                                    duration: 2 + i * 0.3,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: i * 0.2,
                                }}
                            />
                        ))}

                        {/* Center - smaller */}
                        <circle cx="0" cy="0" r="1" fill="#fbbf24" />

                        {/* Leaves */}
                        <ellipse cx="-2" cy="4" rx="1.5" ry="2" fill="#22c55e" transform="rotate(-45 -2 4)" />
                        <ellipse cx="2" cy="4" rx="1.5" ry="2" fill="#22c55e" transform="rotate(45 2 4)" />
                    </motion.g>
                );
            })}
        </g>
    );
}
