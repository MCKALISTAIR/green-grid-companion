import { motion } from 'framer-motion';
import { useId } from 'react';

interface TidalWavesProps {
    intensity?: number; // 0-1, how active the waves are
}

export function TidalWaves({ intensity = 0.5 }: TidalWavesProps) {
    // Grounded at Y=140-150 (bottom corner, in front of front hill)  
    const baseY = 145;
    const id = useId();

    return (
        <motion.g
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 1 }}
        >
            {/* Water surface at bottom right corner */}
            <g transform={`translate(320, ${baseY})`}>
                {/* Water body */}
                <defs>
                    <linearGradient id={`${id}-waterGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                    </linearGradient>
                </defs>

                {/* Water rectangle */}
                <rect
                    x="0"
                    y="0"
                    width="80"
                    height="5"
                    fill={`url(#${id}-waterGrad)`}
                    rx="1"
                />

                {/* Animated wave ripples */}
                {[0, 1, 2].map((i) => (
                    <motion.path
                        key={i}
                        d={`M${i * 25},2 Q${i * 25 + 10},${1 + Math.sin(i) * 0.5} ${i * 25 + 20},2`}
                        stroke="#67e8f9"
                        strokeWidth="1"
                        fill="none"
                        opacity="0.4"
                        animate={{
                            d: [
                                `M${i * 25},2 Q${i * 25 + 10},${1 + Math.sin(i) * 0.5} ${i * 25 + 20},2`,
                                `M${i * 25},2 Q${i * 25 + 10},${2.5 + Math.sin(i) * 0.5} ${i * 25 + 20},2`,
                                `M${i * 25},2 Q${i * 25 + 10},${1 + Math.sin(i) * 0.5} ${i * 25 + 20},2`,
                            ],
                        }}
                        transition={{
                            duration: 2 + i * 0.5,
                            repeat: Infinity,
                            ease: 'easeInOut' as const,
                            delay: i * 0.3,
                        }}
                    />
                ))}

                {/* Foam/whitecaps (higher intensity = more foam) */}
                {intensity > 0.6 && (
                    <motion.ellipse
                        cx="40"
                        cy="1"
                        rx="8"
                        ry="1.5"
                        fill="white"
                        opacity="0.5"
                        animate={{ opacity: [0.3, 0.6, 0.3], scaleX: [0.9, 1.12, 0.9] }}
                        style={{ transformOrigin: '40px 1px' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const }}
                    />
                )}
            </g>
        </motion.g>
    );
}
