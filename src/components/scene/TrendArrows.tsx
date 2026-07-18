import { motion } from 'framer-motion';

interface TrendArrowsProps {
    nextIntensity: number; // Forecast intensity for next hour
    currentIntensity: number;
}

export function TrendArrows({ nextIntensity, currentIntensity }: TrendArrowsProps) {
    // Grounded at Y=10-20 (top corner)
    // Shows trend arrow if next hour significantly different

    const diff = nextIntensity - currentIntensity;
    const showArrow = Math.abs(diff) > 20; // Only show if >20g change
    const isImproving = diff < 0; // Lower intensity = better

    if (!showArrow) return null;

    return (
        <motion.div
            className="absolute top-4 right-12 z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
        >
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${isImproving ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'
                }`}>
                <motion.svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    animate={{
                        y: isImproving ? [-2, 0, -2] : [2, 0, 2],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut' as const,
                    }}
                >
                    {isImproving ? (
                        // Down arrow (improving)
                        <>
                            <path d="M8,12 L4,8 L6,8 L6,4 L10,4 L10,8 L12,8 Z" fill="currentColor" />
                        </>
                    ) : (
                        // Up arrow (worsening)
                        <>
                            <path d="M8,4 L12,8 L10,8 L10,12 L6,12 L6,8 L4,8 Z" fill="currentColor" />
                        </>
                    )}
                </motion.svg>
                <span>{Math.abs(diff).toFixed(0)}g</span>
            </div>
        </motion.div>
    );
}
