import { motion } from 'framer-motion';
import { useId } from 'react';

interface BackgroundMountainsProps {
    isNight: boolean;
}

export function BackgroundMountains({ isNight }: BackgroundMountainsProps) {
    const id = useId();
    // Grounded at Y=30-70 (far background, distant horizon)

    const baseColor = isNight ? '#0f172a' : '#475569';
    const midColor = isNight ? '#1e293b' : '#64748b';
    const highlightColor = isNight ? '#334155' : '#94a3b8';

    return (
        <motion.g
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 0.6, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
        >
            <defs>
                <linearGradient id={`${id}-mountain-back`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={baseColor} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={baseColor} stopOpacity="0.1" />
                </linearGradient>

                <linearGradient id={`${id}-mountain-mid`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={midColor} stopOpacity="0.5" />
                    <stop offset="100%" stopColor={midColor} stopOpacity="0.1" />
                </linearGradient>

                <linearGradient id={`${id}-mountain-front`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={highlightColor} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={highlightColor} stopOpacity="0.1" />
                </linearGradient>
            </defs>

            {/* Farthest layer - soft, tall sweeping curves */}
            <path
                d="M-50,100 Q20,50 90,80 T250,60 T450,90 L450,150 L-50,150 Z"
                fill={`url(#${id}-mountain-back)`}
            />

            {/* Mid layer - distinct jagged but rounded peaks */}
            <path
                d="M0,110 Q40,65 80,95 C120,50 150,45 180,80 C220,30 260,55 290,85 Q350,40 400,100 L400,150 L0,150 Z"
                fill={`url(#${id}-mountain-mid)`}
            />

            {/* Frontmost background layer - rolling foothills */}
            <path
                d="M-20,120 Q60,80 140,110 T320,90 T420,120 L420,150 L-20,150 Z"
                fill={`url(#${id}-mountain-front)`}
            />

            {/* Snow caps on highest mid-layer peaks (if not night) */}
            {!isNight && (
                <g opacity="0.4">
                    <path d="M135,55 Q150,45 160,60 Q150,60 135,55 Z" fill="white" />
                    <path d="M225,45 Q240,35 250,55 Q240,50 225,45 Z" fill="white" />
                </g>
            )}
        </motion.g>
    );
}
