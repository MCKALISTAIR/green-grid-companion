import { motion } from 'framer-motion';

interface ForegroundGrassProps {
    windSpeed: number;
}

export function ForegroundGrass({ windSpeed }: ForegroundGrassProps) {
    // Grounded at Y=145-150 (very bottom, foreground)
    // Sways based on wind speed

    const swayIntensity = Math.min(windSpeed / 30, 1); // Normalize to 0-1

    return (
        <g>
            {/* Multiple grass blades across the foreground */}
            {Array.from({ length: 15 }).map((_, i) => {
                const x = 20 + i * 25; // Spread across scene
                const height = 8 + Math.random() * 4;
                const delay = i * 0.1;

                return (
                    <motion.path
                        key={i}
                        d={`M${x},150 Q${x + 2},${150 - height / 2} ${x + 1},${150 - height}`}
                        stroke="#16a34a"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        animate={{
                            d: [
                                `M${x},150 Q${x + 2},${150 - height / 2} ${x + 1},${150 - height}`,
                                `M${x},150 Q${x + 2 + swayIntensity * 3},${150 - height / 2} ${x + 2 + swayIntensity * 2},${150 - height}`,
                                `M${x},150 Q${x + 2},${150 - height / 2} ${x + 1},${150 - height}`,
                            ],
                        }}
                        transition={{
                            duration: 2 + Math.random(),
                            delay,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        opacity={0.6 + Math.random() * 0.3}
                    />
                );
            })}
        </g>
    );
}
