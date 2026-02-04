import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FuelTrendIndicatorProps {
    currentPerc: number;
    previousPerc: number | null;
    trend: 'up' | 'down' | 'stable' | null;
    size?: 'sm' | 'md';
    showDiff?: boolean;
    className?: string;
}

export function FuelTrendIndicator({
    currentPerc,
    previousPerc,
    trend,
    size = 'sm',
    showDiff = true,
    className,
}: FuelTrendIndicatorProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Show indicator when trend changes, then fade out after 3 seconds
    useEffect(() => {
        if (trend && trend !== 'stable' && previousPerc !== null) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [trend, previousPerc]);

    if (!trend || trend === 'stable' || previousPerc === null) {
        return null;
    }

    const diff = Math.abs(currentPerc - previousPerc).toFixed(1);
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: -5 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 5 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={cn(
                        'inline-flex items-center gap-0.5',
                        trend === 'up' ? 'text-primary' : 'text-destructive',
                        className
                    )}
                >
                    {trend === 'up' ? (
                        <TrendingUp className={iconSize} />
                    ) : (
                        <TrendingDown className={iconSize} />
                    )}
                    {showDiff && (
                        <span className={cn('font-medium', textSize)}>
                            {trend === 'up' ? '+' : '-'}{diff}%
                        </span>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
