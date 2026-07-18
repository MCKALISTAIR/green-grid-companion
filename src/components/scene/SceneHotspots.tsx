import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';

export interface HotspotDef {
    id: string;
    label: string;
    x: number; // % from left
    y: number; // % from top
    visible: boolean;
    fact: string;
}

interface Props {
    hotspots: HotspotDef[];
}

/**
 * Diegetic info layer — small tap targets anchored to "informative" scene props.
 * On tap, opens a fact bubble with a tail pointing back to the prop.
 *
 * Container is pointer-events-none; only the hotspot buttons are interactive,
 * so it never blocks underlying scene gestures.
 */
export function SceneHotspots({ hotspots }: Props) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const { selection } = useHaptics();

    const close = useCallback(() => setActiveId(null), []);

    // Close on Escape
    useEffect(() => {
        if (!activeId) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [activeId, close]);

    return (
        <div
            className="absolute inset-0 z-[35] pointer-events-none"
            aria-hidden={false}
        >
            {hotspots.filter(h => h.visible).map(h => {
                const isActive = activeId === h.id;
                // Bubble flips to the opposite side if the prop is near the edge.
                const flipX = h.x > 60;
                const flipY = h.y > 55;
                return (
                    <div
                        key={h.id}
                        className="absolute"
                        style={{ left: `${h.x}%`, top: `${h.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                        {/* Hotspot button */}
                        <motion.button
                            type="button"
                            className="pointer-events-auto relative grid place-items-center w-7 h-7 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                            onClick={() => {
                                selection();
                                setActiveId(prev => (prev === h.id ? null : h.id));
                            }}
                            aria-label={`Learn about ${h.label}`}
                            aria-expanded={isActive}
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.92 }}
                        >
                            {/* Pulsing ring */}
                            <motion.span
                                className="absolute inset-0 rounded-full border border-white/70"
                                animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }}
                                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' as const }}
                            />
                            {/* Inner dot */}
                            <span
                                className="block w-2.5 h-2.5 rounded-full bg-white/95"
                                style={{ boxShadow: '0 0 8px rgba(255,255,255,0.7)' }}
                            />
                        </motion.button>

                        {/* Anchored fact bubble */}
                        <AnimatePresence>
                            {isActive && (
                                <motion.div
                                    role="dialog"
                                    aria-label={h.label}
                                    initial={{ opacity: 0, y: flipY ? 6 : -6, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: flipY ? 6 : -6, scale: 0.95 }}
                                    transition={{ duration: 0.18, ease: 'easeOut' as const }}
                                    className="pointer-events-auto absolute w-[min(240px,60vw)] rounded-xl border border-white/15 bg-background/85 backdrop-blur-md shadow-2xl"
                                    style={{
                                        // Position bubble on the side that fits within the scene
                                        [flipX ? 'right' : 'left']: '24px',
                                        [flipY ? 'bottom' : 'top']: '24px',
                                    } as React.CSSProperties}
                                >
                                    <div className="flex items-start gap-2 px-3 pt-2.5 pb-1.5">
                                        <h4 className="flex-1 text-xs font-semibold tracking-wide uppercase text-foreground/80">
                                            {h.label}
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={close}
                                            aria-label="Close"
                                            className="text-foreground/60 hover:text-foreground transition-colors -mr-1 -mt-0.5"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <p className="px-3 pb-3 text-[13px] leading-snug text-foreground/90">
                                        {h.fact}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}
