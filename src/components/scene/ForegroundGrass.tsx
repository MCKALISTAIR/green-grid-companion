import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface ForegroundGrassProps {
    windSpeed: number;
}

export function ForegroundGrass({ windSpeed }: ForegroundGrassProps) {
    // Grounded at Y=145-150 (very bottom, foreground)
    // Sways based on wind speed

    const swayIntensity = Math.min(windSpeed / 30, 1); // Normalize to 0-1

    const blades = useMemo(() => {
        return Array.from({ length: 35 }).map((_, i) => {
            const x = 5 + i * 11 + Math.random() * 5; // Denser spread with slight scatter
            const height = 8 + Math.random() * 6;
            const delay = i * 0.05 + Math.random() * 0.2;

            // Varied stroke widths and colors for depth
            const strokeWidth = 1 + (i % 3) * 0.5; // 1, 1.5, 2
            const isForeground = i % 3 === 2;
            const baseColor = isForeground ? "#16a34a" : "#15803d"; // Darker ones sit 'behind'
            const opacity = isForeground ? 0.8 : 0.5 + Math.random() * 0.3;

            // Subtle randomness in the sway to break uniformity
            const swayMultiplier = 1 + Math.random() * 0.5;

            return {
                id: i,
                x,
                height,
                delay,
                strokeWidth,
                baseColor,
                opacity,
                swayMultiplier,
            };
        });
    }, []);

    return (
        <g>
            {/* Multiple grass blades across the foreground */}
            {blades.map((blade) => {
                const swayPeak = swayIntensity * 3 * blade.swayMultiplier;
                const swayMid = swayIntensity * 2 * blade.swayMultiplier;

                return (
                    <motion.path
                        key={blade.id}
                        d={"M" + blade.x + ",150 Q" + (blade.x + 2) + "," + (150 - blade.height / 2) + " " + (blade.x + 1) + "," + (150 - blade.height)}
                        stroke={blade.baseColor}
                        strokeWidth={blade.strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        animate={{
                            d: [
                                "M" + blade.x + ",150 Q" + (blade.x + 2) + "," + (150 - blade.height / 2) + " " + (blade.x + 1) + "," + (150 - blade.height),
                                "M" + blade.x + ",150 Q" + (blade.x + 2 + swayPeak) + "," + (150 - blade.height / 2) + " " + (blade.x + 2 + swayMid) + "," + (150 - blade.height),
                                "M" + blade.x + ",150 Q" + (blade.x + 2) + "," + (150 - blade.height / 2) + " " + (blade.x + 1) + "," + (150 - blade.height),
                            ],
                        }}
                        transition={{
                            duration: 2 + (blade.id % 3) * 0.5,
                            delay: blade.delay,
                            repeat: Infinity,
                            ease: 'easeInOut' as const,
                        }}
                        opacity={blade.opacity}
                    />
                );
            })}
        </g>
    );
}
