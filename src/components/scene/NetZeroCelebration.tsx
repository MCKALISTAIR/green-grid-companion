import { motion } from 'framer-motion';

export function NetZeroCelebration() {
    return (
        <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
        >
            {/* Golden glow overlay */}
            <motion.div
                className="absolute inset-0 bg-gradient-radial from-yellow-400/20 via-amber-300/10 to-transparent"
                animate={{
                    opacity: [0.4, 0.7, 0.4],
                    scale: [1, 1.05, 1],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut' as const,
                }}
            />

            {/* Sparkle particles raining down */}
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute"
                    style={{
                        left: `${5 + i * 4.5}%`,
                        top: '-5%',
                    }}
                    initial={{ y: 0, opacity: 0 }}
                    animate={{
                        y: ['0%', '120%'],
                        opacity: [0, 1, 1, 0],
                        rotate: [0, 180, 360],
                    }}
                    transition={{
                        duration: 3 + Math.random() * 2,
                        delay: i * 0.2,
                        repeat: Infinity,
                        ease: 'linear' as const,
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 12 12">
                        <path
                            d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z"
                            fill="#fbbf24"
                            opacity="0.8"
                        />
                    </svg>
                </motion.div>
            ))}

            {/* Center burst effect */}
            <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 0], opacity: [0, 0.6, 0] }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                    ease: 'easeOut' as const,
                }}
            >
                <div className="w-64 h-64 rounded-full bg-gradient-radial from-yellow-300/40 to-transparent" />
            </motion.div>

            {/* The "Zero-carbon power right now" chip is rendered in the hero HUD flow
                (IntensityHeroOverlay → ZeroCarbonChip) so it can never sit on top of
                the location header. This layer is decoration only. */}
        </motion.div>
    );
}
