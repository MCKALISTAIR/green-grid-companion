import { motion } from 'framer-motion';

interface EVChargingStationProps {
    isCharging: boolean; // Based on clean + night logic
}

export function EVChargingStation({ isCharging }: EVChargingStationProps) {
    // Grounded at Y=115 (midground)
    // Shows at night when clean energy available

    return (
        <g transform="translate(330, 115)">
            <motion.g
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.8 }}
            >
                {/* Charging post */}
                <rect x="-3" y="-20" width="6" height="20" fill="#64748b" rx="1" />

                {/* Screen/display */}
                <rect x="-4" y="-18" width="8" height="6" fill="#1e293b" stroke="#10b981" strokeWidth="0.5" />

                {/* Charging cable */}
                <motion.path
                    d="M0,-12 Q5,-10 8,-8"
                    stroke="#22c55e"
                    strokeWidth="1.5"
                    fill="none"
                    animate={isCharging ? {
                        strokeDashoffset: [0, -10],
                    } : {}}
                    strokeDasharray="2 2"
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'linear' as const,
                    }}
                />

                {/* Car silhouette (small) */}
                <g transform="translate(10, -8)">
                    <rect x="0" y="0" width="12" height="6" fill="#3b82f6" rx="1" />
                    <rect x="2" y="-2" width="8" height="2" fill="#60a5fa" rx="0.5" /> {/* windshield */}
                    {/* Wheels */}
                    <circle cx="2" cy="6" r="1.5" fill="#1e293b" />
                    <circle cx="10" cy="6" r="1.5" fill="#1e293b" />
                </g>

                {/* Charging indicator - green glow */}
                {isCharging && (
                    <motion.circle
                        cx="0"
                        cy="-15"
                        r="2"
                        fill="#22c55e"
                        opacity="0.6"
                        animate={{
                            opacity: [0.3, 0.8, 0.3],
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut' as const,
                        }}
                    />
                )}

                {/* Ground connection */}
                <line x1="-3" y1="0" x2="3" y2="0" stroke="#475569" strokeWidth="2" />
            </motion.g>
        </g>
    );
}
