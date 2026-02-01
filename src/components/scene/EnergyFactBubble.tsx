
import { useEffect, useState } from 'react';
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
}

export function EnergyFactBubble({ intensity, generationMix }: EnergyFactBubbleProps) {
    const { currentFact, refreshFact, tone } = useEnergyFacts();
    const { isNight } = useTimeOfDay();
    const { weather } = useWeatherData();
    const coalStreak = useCoalFreeStreak(generationMix);
    const [isVisible, setIsVisible] = useState(true);

    // Refresh fact on mount and when interactions occur
    const handleRefresh = () => {
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
    };

    // Initial load
    useEffect(() => {
        handleRefresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

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
                    className="absolute top-[30%] right-4 pr-[env(safe-area-inset-right)] z-40 max-w-[200px] md:max-w-[260px]"
                >
                    <div
                        className={`
              relative p-3 rounded-2xl shadow-lg backdrop-blur-md 
              border border-white/20 text-xs md:text-sm font-medium
              cursor-pointer select-none transition-colors
              ${tone === 'snarky'
                                ? 'bg-purple-900/40 text-purple-50 hover:bg-purple-900/50'
                                : 'bg-white/30 text-slate-800 dark:text-slate-100 hover:bg-white/40'
                            }
            `}
                        onClick={() => {
                            // Click to cycle
                            setIsVisible(false);
                            setTimeout(() => handleRefresh(), 300);
                        }}
                    >
                        {/* Speech bubble tail */}
                        <div className={`
              absolute -bottom-2 right-6 w-4 h-4 rotate-45 
              ${tone === 'snarky' ? 'bg-purple-900/40' : 'bg-white/30'}
              backdrop-blur-md border-r border-b border-white/20
            `} />

                        <div className="flex gap-2 items-start">
                            <MessageCircle className="w-3.5 h-3.5 mt-0.5 opacity-70 shrink-0" />
                            <p className="leading-snug">
                                {currentFact.id === 'coal_free_current' && coalStreak.isActive && coalStreak.days * 24 + coalStreak.hours >= 24
                                    ? `The UK has been coal-free for ${formatStreak(coalStreak)}!`
                                    : currentFact.id === 'coal_free_current'
                                        ? null // Don't show this fact if streak < 24h
                                        : currentFact.text
                                }
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
