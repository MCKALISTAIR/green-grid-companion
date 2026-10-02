import { motion } from 'framer-motion';

interface BiomassSmokeProps {
    x: number; // X position in SVG coords
    intensity: number; // 0-1, based on biomass %
}

export function BiomassSmoke({ x, intensity }: BiomassSmokeProps) {
    // Grounded at Y=110 (same as factory/nuclear)
    // Green-tinted smoke for biomass generation

    return (
        <g transform={`translate(${x}, 110)`}>
            <motion.g
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.8 }}
            >
                {/* Smoke stack/chimney */}
                <rect x="-3" y="-25" width="6" height="25" fill="#78716c" />
                <rect x="-4" y="-27" width="8" height="3" fill="#57534e" />

                {/* Green-tinted biomass smoke particles */}
                {Array.from({ length: 5 }).map((_, i) => (
                    <motion.circle
                        key={i}
                        initial={false}
                        cx="0"
                        cy={-30 - i * 8}
                        r={3 + i * 1.5}
                        fill="#22c55e"
                        opacity={0.3 - i * 0.04}
                        animate={{
                            cy: [-30 - i * 8, -50 - i * 12],
                            r: [3 + i * 1.5, 5 + i * 2],
                            opacity: [0.3 - i * 0.04, 0],
                        }}
                        transition={{
                            duration: 3 + i * 0.5,
                            delay: i * 0.3,
                            repeat: Infinity,
                            ease: 'easeOut' as const,
                        }}
                    />
                ))}

                {/* Base building */}
                <rect x="-8" y="-10" width="16" height="10" fill="#a8a29e" rx="1" />

                {/* Green biomass indicator light */}
                <motion.circle
                    initial={false}
                    cx="0"
                    cy="-5"
                    r="1.5"
                    fill="#22c55e"
                    animate={{
                        opacity: [0.6, 1, 0.6],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut' as const,
                    }}
                />
            </motion.g>
        </g>
    );
}
