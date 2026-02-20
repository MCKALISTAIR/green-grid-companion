import { useMemo } from 'react';
import { motion } from 'framer-motion';

export function PollutionWarning() {
    const particles = useMemo(() => {
        return Array.from({ length: 8 }).map((_, i) => ({
            id: i,
            left: `${10 + i * 12}%`,
            top: `${20 + Math.random() * 40}%`,
            duration: 3 + i * 0.5,
            delay: i * 0.3
        }));
    }, []);

    return (
        <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Red vignette overlay */}
            <motion.div
                className="absolute inset-0 bg-gradient-radial from-transparent via-red-900/20 to-red-900/40"
                animate={{
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            {/* Pulsing red border */}
            <motion.div
                className="absolute inset-0 border-4 border-red-500/40 rounded-b-3xl"
                animate={{
                    borderColor: ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.6)', 'rgba(239, 68, 68, 0.2)'],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            {/* Warning icon in top-right */}
            <motion.div
                className="absolute top-4 right-4 z-50"
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.8, 1, 0.8],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M12 2L2 20h20L12 2z"
                        fill="#ef4444"
                        opacity="0.9"
                    />
                    <path
                        d="M12 9v4m0 4h.01"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </svg>
            </motion.div>

            {/* Floating pollution particles */}
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute w-2 h-2 bg-gray-600/40 rounded-full blur-sm"
                    style={{
                        left: particle.left,
                        top: particle.top,
                    }}
                    animate={{
                        y: [0, -30, 0],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: particle.duration,
                        delay: particle.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </motion.div>
    );
}
