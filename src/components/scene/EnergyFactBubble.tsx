
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEnergyFacts } from '@/hooks/useEnergyFacts';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useCoalFreeStreak, formatStreak } from '@/hooks/useCoalFreeStreak';
import { GenerationMix } from '@/lib/carbonApi';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

    // Refresh fact on mount and when interactions occur
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
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={variant === 'bubble'
                        ? `absolute bottom-4 right-4 pr-[env(safe-area-inset-right)] z-40 max-w-[200px] md:max-w-[260px] ${className || ''}`
                        : `w-full ${className || ''}`
                    }
                >
                    <div
                        className={`
              relative rounded-2xl text-xs md:text-sm font-medium
              cursor-pointer select-none transition-colors
              ${variant === 'bubble' ? 'p-3 shadow-lg backdrop-blur-md border border-white/20' : 'py-2 px-4 bg-muted/30 border border-border/40 rounded-full mx-auto w-fit max-w-[90%]'}
              ${variant === 'bubble' && tone === 'snarky'
                                ? 'bg-purple-900/40 text-purple-50 hover:bg-purple-900/50'
                                : variant === 'bubble'
                                    ? 'bg-white/30 text-slate-800 dark:text-slate-100 hover:bg-white/40'
                                    : 'text-foreground/80 hover:bg-muted/50'
                            }
            `}
                        onClick={() => {
                            // Click to cycle
                            if (variant === 'bubble') setIsVisible(false); // Only hide if bubble
                            setTimeout(() => handleRefresh(), 300);
                        }}
                    >
                        {/* Speech bubble tail - only for bubble variant */}
                        {variant === 'bubble' && (
                            <div className={`
              absolute -bottom-2 right-6 w-4 h-4 rotate-45 
              ${tone === 'snarky' ? 'bg-purple-900/40' : 'bg-white/30'}
              backdrop-blur-md border-r border-b border-white/20
            `} />
                        )}

                        <div className={`flex gap-2 ${variant === 'plain' ? 'justify-center text-center italic' : 'items-start'}`}>
                            {variant === 'bubble' && (
                                <MessageCircle className="w-3.5 h-3.5 mt-0.5 opacity-70 shrink-0" />
                            )}
                            <p className="leading-snug">
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
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
