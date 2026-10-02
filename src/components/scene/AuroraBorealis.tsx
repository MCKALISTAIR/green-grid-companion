import { motion } from 'framer-motion';
import { useId } from 'react';

interface AuroraBorealisProps {
    intensity: number; // 0-1, based on how clean the energy is
}

export function AuroraBorealis({ intensity }: AuroraBorealisProps) {
    // Grounded at Y=0-50 (sky layer)
    // Only appears on ultra-clean winter nights
    const id = useId();

    return (
        <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: intensity * 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
        >
            <svg className="absolute top-0 left-0 w-full h-1/2" viewBox="0 0 400 100" preserveAspectRatio="none">
                <defs>
                    {/* Aurora gradient - green with hints of purple/blue */}
                    <linearGradient id={`${id}-auroraGrad1`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                        <stop offset="30%" stopColor="#34d399" stopOpacity="0.6" />
                        <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.8" />
                        <stop offset="70%" stopColor="#34d399" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>

                    <linearGradient id={`${id}-auroraGrad2`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
                        <stop offset="40%" stopColor="#a78bfa" stopOpacity="0.5" />
                        <stop offset="60%" stopColor="#c4b5fd" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Wavy aurora layers */}
                {[0, 1, 2].map((i) => (
                    <motion.path
                        key={i}
                        initial={false}
                        d={`M0,${30 + i * 10} Q100,${20 + i * 8} 200,${30 + i * 10} T400,${30 + i * 10} L400,${50 + i * 10} Q200,${40 + i * 10} 100,${50 + i * 10} T0,${50 + i * 10} Z`}
                        fill={i % 2 === 0 ? `url(#${id}-auroraGrad1)` : `url(#${id}-auroraGrad2)`}
                        opacity={0.7 - i * 0.1}
                        animate={{
                            d: [
                                `M0,${30 + i * 10} Q100,${20 + i * 8} 200,${30 + i * 10} T400,${30 + i * 10} L400,${50 + i * 10} Q200,${40 + i * 10} 100,${50 + i * 10} T0,${50 + i * 10} Z`,
                                `M0,${30 + i * 10} Q100,${35 + i * 8} 200,${25 + i * 10} T400,${30 + i * 10} L400,${50 + i * 10} Q200,${45 + i * 10} 100,${45 + i * 10} T0,${50 + i * 10} Z`,
                                `M0,${30 + i * 10} Q100,${20 + i * 8} 200,${30 + i * 10} T400,${30 + i * 10} L400,${50 + i * 10} Q200,${40 + i * 10} 100,${50 + i * 10} T0,${50 + i * 10} Z`,
                            ],
                        }}
                        transition={{
                            duration: 8 + i * 2,
                            repeat: Infinity,
                            ease: 'easeInOut' as const,
                            delay: i * 0.5,
                        }}
                    />
                ))}
            </svg>
        </motion.div>
    );
}
