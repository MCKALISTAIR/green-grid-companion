import { motion } from 'framer-motion';
import { useState, useId } from 'react';
import { useHaptics } from '@/hooks/useHaptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface NuclearCoolingTowerProps {
    x: number; // X position (0-400 in SVG viewBox)
    steamIntensity?: number; // 0-1, how much steam to show
    isNight?: boolean;
}

interface BurstSteam {
    id: number;
    delay: number;
}

export function NuclearCoolingTower({ x, steamIntensity = 0.7, isNight }: NuclearCoolingTowerProps) {
    const id = useId();
    const { impactLight } = useHaptics({ decorative: true });
    const shouldReduceMotion = useReducedMotion();
    
    const [bursts, setBursts] = useState<BurstSteam[]>([]);
    // Grounded at Y=110 (midground layer)
    const baseY = 110;

    const handleClick = () => {
        impactLight();

        if (!shouldReduceMotion) {
            const newBursts = Array.from({ length: 3 }).map((_, idx) => ({
                id: Date.now() + idx,
                delay: idx * 0.15
            }));
            setBursts(prev => [...prev, ...newBursts]);
            
            // Clean up bursts
            setTimeout(() => {
                setBursts(prev => prev.filter(b => !newBursts.find(nb => nb.id === b.id)));
            }, 3000);
        }
    };

    return (
        <motion.g
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.8 }}
            className="cursor-pointer pointer-events-auto select-none"
            onClick={handleClick}
            role="button"
            tabIndex={0}
            aria-label="Nuclear Cooling Tower - Click to release steam"
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    handleClick();
                }
            }}
        >
            {/* Hyperboloid cooling tower structure */}
            <g transform={`translate(${x}, ${baseY})`}>
                {/* Tower body - hyperboloid shape */}
                <defs>
                    <linearGradient id={`towerGrad${x}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.9" />
                        <stop offset="50%" stopColor="#f1f5f9" />
                        <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.9" />
                    </linearGradient>

                    {/* Steam gradient - purple/cyan tint for nuclear */}
                    <linearGradient id={`steamGrad${x}`} x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#c4b5fd" stopOpacity={steamIntensity * 0.6} />
                        <stop offset="50%" stopColor="#a5b4fc" stopOpacity={steamIntensity * 0.4} />
                        <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0" />
                    </linearGradient>

                    {/* Steam Burst gradient (richer purple-pink glow) */}
                    <linearGradient id={`burstGrad${x}`} x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.85" />
                        <stop offset="60%" stopColor="#c084fc" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#f3e8ff" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Base shadow */}
                <ellipse
                    cx="0"
                    cy="2"
                    rx="12"
                    ry="3"
                    fill="rgba(0,0,0,0.2)"
                />

                {/* Tower structure */}
                <path
                    d="M-10,0 Q-6,-15 -8,-30 L8,-30 Q6,-15 10,0 Z"
                    fill={`url(#towerGrad${x})`}
                    stroke="#94a3b8"
                    strokeWidth="0.5"
                />

                {/* Concrete base/foundation */}
                <rect
                    x="-11"
                    y="0"
                    width="22"
                    height="6"
                    fill="#94a3b8"
                    stroke="#64748b"
                    strokeWidth="0.5"
                />

                {/* Horizontal bands */}
                <line x1="-9" y1="-8" x2="9" y2="-8" stroke="#94a3b8" strokeWidth="0.5" opacity="0.3" />
                <line x1="-7" y1="-18" x2="7" y2="-18" stroke="#94a3b8" strokeWidth="0.5" opacity="0.3" />

                {/* Nuclear glow at base */}
                {isNight && (
                    <motion.ellipse
                        initial={false}
                        cx="0"
                        cy="-5"
                        rx="6"
                        ry="2"
                        fill="#818cf8"
                        opacity="0.3"
                        animate={{ opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                )}

                {/* Rising standard steam particles */}
                {[...Array(4)].map((_, i) => (
                    <motion.circle
                        key={i}
                        cx={-3 + i * 2}
                        cy={-30}
                        r={2 + i * 0.5}
                        fill={`url(#steamGrad${x})`}
                        initial={{ y: 0, opacity: steamIntensity }}
                        animate={{
                            y: [-5, -25],
                            opacity: [steamIntensity * 0.6, 0],
                            scale: [1, 1.8],
                        }}
                        transition={{
                            duration: 3 + i * 0.5,
                            delay: i * 0.7,
                            repeat: Infinity,
                            ease: 'easeOut',
                        }}
                    />
                ))}

                {/* Click-triggered steam burst clouds */}
                {bursts.map((b) => (
                    <motion.circle
                        key={b.id}
                        cx={Math.random() * 8 - 4}
                        cy={-30}
                        r={5}
                        fill={`url(#burstGrad${x})`}
                        initial={{ y: 0, opacity: 0.9, scale: 0.8 }}
                        animate={{
                            y: [-8, -60],
                            opacity: [0.9, 0],
                            scale: [0.8, 3.5]
                        }}
                        transition={{
                            duration: 2.2,
                            delay: b.delay,
                            ease: 'easeOut'
                        }}
                    />
                ))}
            </g>
        </motion.g>
    );
}
