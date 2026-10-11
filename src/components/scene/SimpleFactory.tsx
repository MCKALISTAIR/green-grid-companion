import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SimpleFactoryProps {
    className?: string;
    isNight?: boolean;
    style?: React.CSSProperties;
}

interface SootParticle {
    id: number;
    x: number;
    y: number;
}

/**
 * Minimalist geometric factory icon that matches the app's flat design aesthetic.
 * Now supports click-to-sputter animations with soot particle bursts and haptics.
 */
export function SimpleFactory({ className = '', isNight = false, style }: SimpleFactoryProps) {
    const { impactLight } = useHaptics({ decorative: true });
    const shouldReduceMotion = useReducedMotion();
    const [isWobbling, setIsWobbling] = useState(false);
    const [particles, setParticles] = useState<SootParticle[]>([]);

    const handleClick = () => {
        impactLight();
        
        if (!shouldReduceMotion) {
            setIsWobbling(true);
            setTimeout(() => setIsWobbling(false), 500);

            // Generate soot particles
            const newParticles = Array.from({ length: 4 }).map((_, idx) => ({
                id: Date.now() + idx,
                x: 20 + Math.random() * 45, // near the chimneys (chimneys at x=20, x=55)
                y: 10 + Math.random() * 10
            }));
            
            setParticles(prev => [...prev, ...newParticles]);
            setTimeout(() => {
                setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
            }, 1200);
        }
    };

    return (
        <motion.div
            className="relative cursor-pointer pointer-events-auto select-none"
            onClick={handleClick}
            animate={isWobbling ? {
                rotate: [-2, 2, -2, 2, 0],
                scale: [1, 0.96, 1.02, 1]
            } : {}}
            transition={{ duration: 0.5 }}
        >
            <svg
                viewBox="0 0 100 100"
                className={className}
                style={style}
                fill="currentColor"
                aria-hidden="true"
            >
                {/* Main building - simple rectangle */}
                <rect x="10" y="50" width="35" height="45" rx="2" opacity="0.9" />

                {/* Second building section - stepped */}
                <rect x="45" y="35" width="30" height="60" rx="2" opacity="0.85" />

                {/* Tall chimney/smokestack 1 */}
                <rect x="20" y="25" width="8" height="25" rx="1" opacity="0.95" />

                {/* Tall chimney/smokestack 2 */}
                <rect x="55" y="15" width="8" height="20" rx="1" opacity="0.95" />

                {/* Windows - simple squares */}
                {isNight && (
                    <>
                        <rect x="17" y="60" width="6" height="6" fill="#fbbf24" opacity="0.8" rx="0.5" />
                        <rect x="30" y="60" width="6" height="6" fill="#fbbf24" opacity="0.7" rx="0.5" />
                        <rect x="17" y="75" width="6" height="6" fill="#fbbf24" opacity="0.6" rx="0.5" />
                        <rect x="52" y="50" width="6" height="6" fill="#fbbf24" opacity="0.8" rx="0.5" />
                        <rect x="62" y="50" width="6" height="6" fill="#fbbf24" opacity="0.7" rx="0.5" />
                    </>
                )}

                {/* Click-to-sputter soot particles */}
                {particles.map((p) => (
                    <motion.circle
                        key={p.id}
                        cx={p.x}
                        cy={p.y}
                        r="3"
                        fill="#334155"
                        initial={{ y: 0, opacity: 0.8, scale: 1 }}
                        animate={{
                            y: [-5, -45],
                            x: [p.x, p.x + (Math.random() * 20 - 10)],
                            opacity: [0.8, 0],
                            scale: [1, 2.2]
                        }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    />
                ))}
            </svg>
        </motion.div>
    );
}

interface AnimatedSimpleFactoryProps extends SimpleFactoryProps {
    delay?: number;
}

/**
 * Animated version that fades in
 */
export function AnimatedSimpleFactory({ delay = 0, ...props }: AnimatedSimpleFactoryProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4, delay }}
        >
            <SimpleFactory {...props} />
        </motion.div>
    );
}
