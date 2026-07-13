import { motion } from 'framer-motion';
import { useState } from 'react';

interface OwlProps {
    treeX: number; // X position to perch on tree (0-400 SVG coords)
    treeY: number; // Y position on tree branch
    scale?: number; // Optional scale factor
}

export function Owl({ treeX, treeY, scale = 1 }: OwlProps) {
    const [isHooting, setIsHooting] = useState(false);

    // Trigger random hoots
    useState(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                setIsHooting(true);
                setTimeout(() => setIsHooting(false), 1000);
            }
        }, 5000);
        return () => clearInterval(interval);
    });

    return (
        <motion.g
            transform={`translate(${treeX}, ${treeY}) scale(${scale})`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.8 }}
        >
            {/* Owl perched on branch */}
            <g>
                {/* Body */}
                <ellipse cx="0" cy="0" rx="6" ry="8" fill="#8b7355" />

                {/* Wing (left side visible) */}
                <path d="M-6,-2 Q-8,0 -6,6" fill="#6b5345" fillOpacity="0.8" />

                {/* Head */}
                <circle cx="0" cy="-6" r="5" fill="#9b8365" />

                {/* Ear tufts */}
                <path d="M-3,-10 L-2,-7" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M3,-10 L2,-7" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" />

                {/* Eyes */}
                <motion.g
                    animate={isHooting ? {
                        scale: [1, 1.2, 1],
                    } : {}}
                    transition={{ duration: 0.3 }}
                >
                    {/* Left eye */}
                    <circle cx="-2" cy="-6" r="2.5" fill="#fbbf24" />
                    <circle cx="-2" cy="-6" r="1.2" fill="#1e293b" />

                    {/* Right eye */}
                    <circle cx="2" cy="-6" r="2.5" fill="#fbbf24" />
                    <circle cx="2" cy="-6" r="1.2" fill="#1e293b" />
                </motion.g>

                {/* Beak */}
                <path d="M0,-5 L-1,-3 L1,-3 Z" fill="#e0a020" />

                {/* Feet gripping branch */}
                <path d="M-2,8 L-2,10 M-3,10 L-1,10" stroke="#6b5345" strokeWidth="1" />
                <path d="M2,8 L2,10 M1,10 L3,10" stroke="#6b5345" strokeWidth="1" />
            </g>

            {/* Hoot text */}
            {isHooting && (
                <motion.text
                    x="8"
                    y="-8"
                    fontSize="8"
                    fill="white"
                    opacity="0.8"
                    fontFamily="sans-serif"
                    initial={{ opacity: 0, x: 0 }}
                    animate={{ opacity: [0, 1, 0], x: [0, 5, 10] }}
                    transition={{ duration: 1 }}
                >
                    Hoot!
                </motion.text>
            )}
        </motion.g>
    );
}
