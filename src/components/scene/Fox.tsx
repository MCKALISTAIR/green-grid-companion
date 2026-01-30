import { motion } from 'framer-motion';

export function Fox() {
    // Rare event - fox runs across at dusk
    // Grounded at Y=130% (front hill)

    return (
        <motion.div
            className="absolute bottom-[22%] pointer-events-none z-20"
            initial={{ left: '-15%', opacity: 0 }}
            animate={{
                left: '115%',
                opacity: [0, 1, 1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
                duration: 12,
                ease: 'linear',
            }}
        >
            <motion.div
                // Subtle running bob
                animate={{
                    y: [0, -3, 0, -3, 0],
                }}
                transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            >
                <svg width="32" height="24" viewBox="0 0 32 24">
                    {/* Tail (bushy) */}
                    <ellipse cx="4" cy="14" rx="5" ry="8" fill="#d97706" transform="rotate(-30 4 14)" />
                    <ellipse cx="3" cy="16" rx="4" ry="6" fill="#f59e0b" transform="rotate(-30 3 16)" />

                    {/* Body */}
                    <ellipse cx="16" cy="16" rx="9" ry="6" fill="#d97706" />

                    {/* Head */}
                    <ellipse cx="24" cy="12" rx="5" ry="5.5" fill="#ea580c" />

                    {/* Ears */}
                    <path d="M22,8 L21,5 L23,8" fill="#ea580c" />
                    <path d="M26,8 L25,5 L27,8" fill="#ea580c" />

                    {/* Snout */}
                    <ellipse cx="27" cy="13" rx="2.5" ry="2" fill="#f59e0b" />

                    {/* Nose */}
                    <circle cx="28" cy="13" r="1" fill="#1e293b" />

                    {/* Eye */}
                    <circle cx="25" cy="11" r="1.2" fill="#1e293b" />

                    {/* Legs (simple lines) */}
                    <motion.g
                        animate={{
                            rotate: [0, 10, -10, 0],
                        }}
                        transition={{
                            duration: 0.4,
                            repeat: Infinity,
                        }}
                    >
                        <rect x="12" y="20" width="2" height="4" rx="1" fill="#d97706" />
                        <rect x="18" y="20" width="2" height="4" rx="1" fill="#d97706" />
                    </motion.g>

                    {/* White chest marking */}
                    <ellipse cx="20" cy="17" rx="3" ry="2" fill="#fef3c7" opacity="0.9" />
                </svg>
            </motion.div>
        </motion.div>
    );
}
