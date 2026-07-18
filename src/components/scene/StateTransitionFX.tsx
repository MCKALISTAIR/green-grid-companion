import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { BandTransition } from '@/hooks/useCleanlinessBand';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useHaptics } from '@/hooks/useHaptics';
import { NotificationType } from '@capacitor/haptics';

interface Props {
    transition: BandTransition | null;
}

/**
 * Brief celebratory / cautionary flourish when the cleanliness band changes.
 * Pure CSS+framer, no layout impact, respects reduced-motion.
 *
 *  - cleaner   → green particle rise + soft white bloom.
 *  - dirtier   → grey smoke puff + red-tinted edge vignette pulse.
 */
export function StateTransitionFX({ transition }: Props) {
    const reduced = useReducedMotion();
    const { notification } = useHaptics();

    useEffect(() => {
        if (!transition || reduced) return;
        
        if (transition.direction === 'cleaner') {
            notification(NotificationType.Success);
        } else {
            notification(NotificationType.Warning);
        }
    }, [transition, reduced, notification]);

    if (reduced || !transition) return null;

    const cleaner = transition.direction === 'cleaner';
    const key = `${transition.from}-${transition.to}-${transition.at}`;

    return (
        <AnimatePresence>
            <motion.div
                key={key}
                className="absolute inset-0 z-[30] pointer-events-none overflow-hidden"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                aria-hidden="true"
            >
                {cleaner ? (
                    <>
                        {/* Soft white bloom */}
                        <motion.div
                            className="absolute inset-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.55, 0] }}
                            transition={{ duration: 1.8, ease: 'easeOut' as const }}
                            style={{
                                background:
                                    'radial-gradient(ellipse at 50% 60%, rgba(180,255,220,0.55), rgba(180,255,220,0) 65%)',
                                mixBlendMode: 'screen',
                            }}
                        />
                        {/* Rising green particles */}
                        {Array.from({ length: 14 }).map((_, i) => (
                            <motion.span
                                key={i}
                                className="absolute block rounded-full"
                                style={{
                                    left: `${5 + i * 7}%`,
                                    bottom: '20%',
                                    width: 4 + (i % 3),
                                    height: 4 + (i % 3),
                                    background: 'rgba(120,230,170,0.85)',
                                    boxShadow: '0 0 8px rgba(120,230,170,0.6)',
                                }}
                                initial={{ y: 0, opacity: 0 }}
                                animate={{ y: -180 - (i % 5) * 20, opacity: [0, 1, 0] }}
                                transition={{ duration: 2.4, delay: i * 0.05, ease: 'easeOut' as const }}
                            />
                        ))}
                    </>
                ) : (
                    <>
                        {/* Red-tinted vignette pulse */}
                        <motion.div
                            className="absolute inset-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.45, 0] }}
                            transition={{ duration: 1.8, ease: 'easeOut' as const }}
                            style={{
                                background:
                                    'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 50%, rgba(120,30,10,0.85) 100%)',
                            }}
                        />
                        {/* Smoke puff */}
                        {Array.from({ length: 6 }).map((_, i) => (
                            <motion.span
                                key={i}
                                className="absolute block rounded-full"
                                style={{
                                    left: `${72 + i * 1.5}%`,
                                    top: '38%',
                                    width: 18 + i * 3,
                                    height: 18 + i * 3,
                                    background: 'rgba(80,75,70,0.55)',
                                    filter: 'blur(6px)',
                                }}
                                initial={{ y: 0, opacity: 0, scale: 0.6 }}
                                animate={{ y: -60 - i * 8, opacity: [0, 0.7, 0], scale: 1.4 }}
                                transition={{ duration: 2.2, delay: i * 0.08, ease: 'easeOut' as const }}
                            />
                        ))}
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
