import { motion } from 'framer-motion';

interface RabbitProps {
    delay?: number;
}

export function Rabbit({ delay = 0 }: RabbitProps) {
    // Hops across the scene at dawn/dusk
    // Grounded at Y=140-145% (foreground ground level)

    return (
        <motion.div
            className="absolute bottom-[18%] pointer-events-none"
            initial={{ left: '-10%', opacity: 0 }}
            animate={{
                left: '110%',
                opacity: [0, 1, 1, 1, 0],
            }}
            transition={{
                duration: 20,
                delay,
                ease: 'linear' as const,
            }}
        >
            <motion.div
                animate={{
                    y: [0, -15, 0], // Hopping motion
                }}
                transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    ease: 'easeInOut' as const,
                }}
            >
                <svg width="24" height="28" viewBox="0 0 24 28">
                    {/* Body */}
                    <ellipse cx="12" cy="18" rx="7" ry="8" fill="#a0a0a0" />

                    {/* Head */}
                    <circle cx="12" cy="10" r="5" fill="#b0b0b0" />

                    {/* Ears */}
                    <ellipse cx="9" cy="3" rx="2" ry="5" fill="#b0b0b0" />
                    <ellipse cx="15" cy="3" rx="2" ry="5" fill="#b0b0b0" />

                    {/* Inner ears */}
                    <ellipse cx="9" cy="4" rx="1" ry="3" fill="#f0c0c0" />
                    <ellipse cx="15" cy="4" rx="1" ry="3" fill="#f0c0c0" />

                    {/* Eye */}
                    <circle cx="14" cy="10" r="1.5" fill="#1e293b" />

                    {/* Nose */}
                    <circle cx="12" cy="12" r="1" fill="#db2777" />

                    {/* Back leg (visible) */}
                    <ellipse cx="16" cy="24" rx="3" ry="4" fill="#909090" />

                    {/* Tail */}
                    <circle cx="18" cy="18" r="2.5" fill="#d0d0d0" />
                </svg>
            </motion.div>
        </motion.div>
    );
}
