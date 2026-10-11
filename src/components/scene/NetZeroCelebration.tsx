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

            {/* The "Zero-carbon power right now" badge is rendered by the hero HUD
                (ZeroCarbonBadge, below the band label) so it can't cover the location
                header. This layer is decoration only. */}
        </motion.div>
    );
}

/**
 * "Zero-carbon power right now" badge. Same look as before; it now sits in the
 * hero HUD's normal flow (IntensityHeroOverlay) instead of absolutely at the top
 * of the scene, where it covered the location header. Final placement/style is
 * GridSense Design's (home-screen mockups).
 */
export function ZeroCarbonBadge() {
    return (
        <motion.div
            className="mt-2 flex justify-center"
            data-testid="zero-carbon-badge"
            role="status"
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' as const }}
        >
            <div className="bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                    />
                </svg>
                <span className="font-semibold">Zero-carbon power right now</span>
            </div>
        </motion.div>
    );
}
