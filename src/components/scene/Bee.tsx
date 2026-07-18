import { motion } from 'framer-motion';

interface BeeProps {
    startX: number; // Starting X position (%)
    startY: number; // Starting Y position (%)
    delay?: number;
}

export function Bee({ startX, startY, delay = 0 }: BeeProps) {
    // Bee visits flowers in a figure-8 pattern
    // Grounded at Y=100-130% (midground flower level)

    return (
        <motion.div
            className="absolute pointer-events-none"
            style={{
                left: `${startX}%`,
                bottom: `${startY}%`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                opacity: [0, 1, 1, 1, 0],
                scale: 1,
                x: [
                    0,          // Start
                    20,         // Right
                    10,         // Center-right
                    -10,        // Center-left
                    -20,        // Left
                    -10,        // Center-left
                    10,         // Center-right
                    0,          // Back to start
                ],
                y: [
                    0,          // Start
                    -10,        // Up-right
                    -15,        // Up
                    -10,        // Up-left
                    0,          // Center
                    10,         // Down-left
                    15,         // Down
                    10,          // Down-right
                ],
            }}
            transition={{
                duration: 8,
                delay,
                repeat: Infinity,
                ease: 'easeInOut' as const,
            }}
        >
            <svg width="16" height="16" viewBox="0 0 16 16">
                {/* Bee body */}
                <ellipse cx="8" cy="8" rx="3" ry="4" fill="#fbbf24" />

                {/* Black stripes */}
                <rect x="6" y="6" width="4" height="1.5" fill="#1e293b" rx="0.5" />
                <rect x="6" y="9" width="4" height="1.5" fill="#1e293b" rx="0.5" />

                {/* Wings - animated */}
                <motion.g
                    animate={{
                        rotateX: [0, 60, 0],
                        opacity: [0.6, 0.3, 0.6],
                    }}
                    transition={{
                        duration: 0.2,
                        repeat: Infinity,
                        ease: 'easeInOut' as const,
                    }}
                >
                    <ellipse cx="5" cy="6" rx="3" ry="4" fill="white" opacity="0.6" transform="rotate(-30 5 6)" />
                    <ellipse cx="11" cy="6" rx="3" ry="4" fill="white" opacity="0.6" transform="rotate(30 11 6)" />
                </motion.g>

                {/* Head */}
                <circle cx="8" cy="4" r="2" fill="#1e293b" />

                {/* Antennae */}
                <line x1="7" y1="3" x2="6" y2="1" stroke="#1e293b" strokeWidth="0.5" />
                <line x1="9" y1="3" x2="10" y2="1" stroke="#1e293b" strokeWidth="0.5" />
            </svg>
        </motion.div>
    );
}
