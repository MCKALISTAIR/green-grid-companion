import { useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SheepProps {
    x: number;
    y: number;
    scale?: number;
    isNight: boolean;
    delay?: number;
}

export function Sheep({ x, y, scale = 1, isNight, delay = 0 }: SheepProps) {
    const [isJumping, setIsJumping] = useState(false);
    const id = useId();

    const handleClick = () => {
        if (isJumping) return;
        setIsJumping(true);
        setTimeout(() => setIsJumping(false), 1000);
    };

    return (
        <motion.div
            className="absolute z-10 cursor-pointer"
            style={{ left: `${x}%`, bottom: `${y}%`, transform: `scale(${scale})` }}
            onClick={handleClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay, duration: 1 }}
        >
            <motion.div
                animate={isJumping ? { y: -20, rotate: -10 } : { y: 0, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
                <svg width="40" height="30" viewBox="0 0 40 30" overflow="visible">
                    {/* Internal Definitions */}
                    <defs>
                        <radialGradient id={`wool-${id}`} cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="100%" stopColor="#e2e8f0" />
                        </radialGradient>
                    </defs>

                    {/* Legs */}
                    <motion.g
                        animate={isJumping ? {} : { rotate: [0, 5, 0, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: delay }}
                    >
                        <rect x="10" y="20" width="3" height="10" rx="1.5" fill="#1e293b" />
                        <rect x="25" y="20" width="3" height="10" rx="1.5" fill="#1e293b" />
                    </motion.g>

                    {/* Body (Fluffy Cloud shape) */}
                    <path
                        d="M10,15 Q5,5 15,5 Q20,-2 25,5 Q35,0 35,10 Q40,15 35,20 Q30,28 20,25 Q10,28 5,20 Q0,18 10,15 Z"
                        fill={`url(#wool-${id})`}
                        filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.2))"
                    />

                    {/* Head */}
                    <g transform={isNight ? "translate(32, 12) rotate(15)" : "translate(32, 8)"}>
                        {/* Face */}
                        <ellipse cx="0" cy="0" rx="6" ry="7" fill="#1e293b" />
                        {/* Ears */}
                        <ellipse cx="-6" cy="-2" rx="4" ry="2" fill="#1e293b" transform="rotate(-30)" />
                        <ellipse cx="6" cy="-2" rx="4" ry="2" fill="#1e293b" transform="rotate(30)" />
                        {/* Eyes (Open or Closed) */}
                        {isNight ? (
                            // Sleeping eyes
                            <path d="M-3,0 Q-1,2 1,0 M3,0 Q5,2 7,0" stroke="white" strokeWidth="1.5" fill="none" transform="scale(0.5)" />
                        ) : (
                            // Awake eyes
                            <>
                                <circle cx="-2" cy="0" r="1.5" fill="white" />
                                <circle cx="2" cy="0" r="1.5" fill="white" />
                            </>
                        )}
                    </g>

                    {/* Zzz for sleeping */}
                    <AnimatePresence>
                        {isNight && !isJumping && (
                            <motion.g
                                initial={{ opacity: 0, y: 0, x: 30 }}
                                animate={{ opacity: [0, 1, 0], y: -20, x: 40 }}
                                transition={{ duration: 2, repeat: Infinity, delay: delay }}
                            >
                                <text x="0" y="0" fontSize="10" fill="white" fontFamily="sans-serif" fontWeight="bold">Z</text>
                            </motion.g>
                        )}
                    </AnimatePresence>

                    {/* Reaction "!" when clicked/jumping */}
                    <AnimatePresence>
                        {isJumping && (
                            <motion.text
                                initial={{ opacity: 0, y: 0 }}
                                animate={{ opacity: 1, y: -25, scale: 1.5 }}
                                exit={{ opacity: 0 }}
                                x="20" y="0"
                                fontSize="14"
                                fill="#fbbf24" // Amber
                                fontWeight="bold"
                                textAnchor="middle"
                            >
                                Bah!
                            </motion.text>
                        )}
                    </AnimatePresence>

                </svg>
            </motion.div>
        </motion.div>
    );
}
