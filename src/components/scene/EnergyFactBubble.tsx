
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEnergyFacts } from '@/hooks/useEnergyFacts';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useCoalFreeStreak, formatStreak } from '@/hooks/useCoalFreeStreak';
import { GenerationMix } from '@/lib/carbonApi';
import { MessageCircle } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface EnergyFactBubbleProps {
    intensity: number;
    generationMix?: GenerationMix[];
    className?: string;
    variant?: 'bubble' | 'plain';
}

export function EnergyFactBubble({ intensity, generationMix, className, variant = 'bubble' }: EnergyFactBubbleProps) {
    const { currentFact, refreshFact, tone } = useEnergyFacts();
    const { isNight } = useTimeOfDay();
    const { weather } = useWeatherData();
    const coalStreak = useCoalFreeStreak(generationMix);
    const [isVisible, setIsVisible] = useState(true);
    const shouldReduceMotion = useReducedMotion();

    // Refresh fact on mount and when interactions occur
    const handleRefresh = useCallback(() => {
        refreshFact({
            intensity,
            windSpeed: weather?.windSpeed ?? 0,
            isDay: !isNight,
            generationMix,
            isRaining: weather?.isRaining,
            isSnowing: weather?.isSnowing,
            temperature: weather?.temperature
        });
        setIsVisible(true);
    }, [refreshFact, intensity, weather, isNight, generationMix]);

    // Initial load
    useEffect(() => {
        handleRefresh();
    }, [handleRefresh]); // Run once on mount (or when deps change)

    // Auto-refresh every 45s if visible, or context changes significantly
    useEffect(() => {
        const interval = setInterval(handleRefresh, 45000);
        return () => clearInterval(interval);
    }, [handleRefresh]);

    if (!currentFact) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={!shouldReduceMotion ? { opacity: 0, y: 10, scale: 0.9 } : { opacity: 0 }}
                    animate={!shouldReduceMotion ? {
                        opacity: 1,
                        y: [0, -3, 0],
                        scale: 1,
                    } : { opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: !shouldReduceMotion ? 0.9 : 1 }}
                    transition={!shouldReduceMotion ? {
                        y: {
                            repeat: Infinity,
                            duration: 5,
                            ease: 'easeInOut' as const,
                        },
                        opacity: { duration: 0.3 },
                        scale: { duration: 0.3 }
                    } : { duration: 0.2 }}
                    whileHover={!shouldReduceMotion ? { scale: 1.018 } : {}}
                    className={variant === 'bubble'
                        ? `absolute bottom-4 right-4 pr-[env(safe-area-inset-right)] z-40 max-w-[200px] md:max-w-[260px] ${className || ''}`
                        : `w-full ${className || ''}`
                    }
                >
                    <motion.div
                        layout
                        whileTap={!shouldReduceMotion ? { scale: 0.96 } : {}}
                        role="button"
                        tabIndex={0}
                        aria-label={`${currentFact.text}. Press to cycle facts.`}
                        className={`
              relative cursor-pointer select-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50
              ${variant === 'bubble'
                ? 'rounded-2xl text-xs md:text-sm font-medium p-3 shadow-lg backdrop-blur-md border border-white/20'
                : 'rounded-none py-2.5 px-1 bg-transparent border-0 mx-auto w-fit max-w-[92%] font-display text-[15px] sm:text-base font-medium leading-snug'}
              ${variant === 'bubble' && tone === 'snarky'
                                ? 'bg-primary/25 text-primary-foreground hover:bg-primary/35'
                                : variant === 'bubble'
                                    ? 'bg-white/30 text-slate-800 dark:text-slate-100 hover:bg-white/40'
                                    : 'text-foreground/75 hover:text-foreground'
                            }
            `}
                        transition={{
                            layout: { type: 'spring', stiffness: 280, damping: 28 }
                        }}
                        onClick={handleRefresh}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleRefresh();
                            }
                        }}
                    >
                        {/* Speech bubble tail - only for bubble variant */}
                        {variant === 'bubble' && (
                            <div className={`
              absolute -bottom-2 right-6 w-4 h-4 rotate-45 
              ${tone === 'snarky' ? 'bg-primary/30' : 'bg-white/30'}
              backdrop-blur-md border-r border-b border-white/20
            `} />
                        )}

                        <div className={`flex gap-2 ${variant === 'plain' ? 'justify-center text-center italic' : 'items-start'}`}>
                            {variant === 'bubble' && (
                                <MessageCircle className="w-3.5 h-3.5 mt-0.5 opacity-70 shrink-0" />
                            )}
                            <div className="flex flex-col gap-0.5 leading-snug w-full">
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.p
                                        key={currentFact.id + '-' + currentFact.text}
                                        initial={!shouldReduceMotion ? { opacity: 0, y: 10, scale: 0.97 } : { opacity: 0 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={!shouldReduceMotion ? { opacity: 0, y: -10, scale: 0.97 } : { opacity: 0 }}
                                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                                        className={`w-full ${variant === 'plain' ? 'text-center' : 'text-left'}`}
                                    >
                                        {variant === 'plain' && (
                                            <span className="text-primary/60 text-lg leading-none select-none align-top mr-1">"</span>
                                        )}
                                        {currentFact.id === 'coal_free_current' && coalStreak.isActive && coalStreak.days * 24 + coalStreak.hours >= 24
                                            ? `The UK has been coal-free for ${formatStreak(coalStreak)}!`
                                            : currentFact.id === 'coal_free_current'
                                                ? null // Don't show this fact if streak < 24h
                                                : currentFact.text
                                        }
                                        {variant === 'plain' && (
                                            <span className="text-primary/60 text-lg leading-none select-none align-top ml-1 rotate-180 inline-block transform translate-y-0.5">"</span>
                                        )}
                                    </motion.p>
                                </AnimatePresence>
                                {variant === 'bubble' && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal self-end mt-1 block">
                                        ↻ tap to cycle
                                    </span>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
