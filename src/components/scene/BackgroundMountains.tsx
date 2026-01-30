import { motion } from 'framer-motion';

interface BackgroundMountainsProps {
    isNight: boolean;
}

export function BackgroundMountains({ isNight }: BackgroundMountainsProps) {
    // Grounded at Y=30-70 (far background, distant horizon)

    const mountainColor = isNight ? '#1e293b' : '#475569';

    return (
        <motion.g
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 0.4, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
        >
            {/* Distant mountain range silhouette */}
            {/* Left peak */}
            <path
                d="M0,70 L50,45 L100,60 L100,150 L0,150 Z"
                fill={mountainColor}
                opacity="0.3"
            />

            {/* Center peak (tallest) */}
            <path
                d="M80,70 L150,30 L220,55 L220,150 L80,150 Z"
                fill={mountainColor}
                opacity="0.4"
            />

            {/* Right peak */}
            <path
                d="M200,70 L280,40 L350,62 L400,68 L400,150 L200,150 Z"
                fill={mountainColor}
                opacity="0.35"
            />

            {/* Snow caps on peaks (if not night) */}
            {!isNight && (
                <>
                    <path d="M145,30 L150,27 L155,30 L150,32 Z" fill="white" opacity="0.7" />
                    <path d="M275,40 L280,37 L285,40 Z" fill="white" opacity="0.6" />
                </>
            )}
        </motion.g>
    );
}
