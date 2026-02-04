import { Flame, Leaf, TrendingDown, TrendingUp, Trophy, Sparkles } from 'lucide-react';
import { FuelStreak, formatStreakDuration } from '@/hooks/useFuelStreaks';
import { FuelMilestone } from '@/hooks/useFuelMilestones';
import { cn } from '@/lib/utils';

interface FuelInsightBadgeProps {
    streak?: FuelStreak;
    milestone?: FuelMilestone;
    compact?: boolean;
}

export function FuelInsightBadge({ streak, milestone, compact = false }: FuelInsightBadgeProps) {
    // Streak badge for fossil fuels at 0%
    if (streak?.isActive) {
        const duration = formatStreakDuration(streak.days, streak.hours);

        if (compact) {
            return (
                <div className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                    streak.isNewRecord
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                )}>
                    {streak.isNewRecord ? (
                        <Trophy className="w-2.5 h-2.5" />
                    ) : (
                        <Leaf className="w-2.5 h-2.5" />
                    )}
                    <span>{duration} free</span>
                </div>
            );
        }

        return (
            <div className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs",
                streak.isNewRecord
                    ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30"
                    : "bg-emerald-500/10 border border-emerald-500/20"
            )}>
                {streak.isNewRecord ? (
                    <>
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                            New record! {duration} {streak.fuel}-free
                        </span>
                    </>
                ) : (
                    <>
                        <Leaf className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">
                            {duration} without {streak.fuel}
                        </span>
                    </>
                )}
            </div>
        );
    }

    // Milestone badge for lows/highs
    if (milestone) {
        const fuelName = milestone.fuel.charAt(0).toUpperCase() + milestone.fuel.slice(1);
        const periodWeeks = Math.floor(milestone.periodDays / 7);
        const periodText = periodWeeks > 4 ? `${Math.floor(periodWeeks / 4)}mo` : `${periodWeeks}w`;

        if (milestone.type === 'low') {
            if (compact) {
                return (
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400">
                        <TrendingDown className="w-2.5 h-2.5" />
                        <span>{periodText} low</span>
                    </div>
                );
            }

            return (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-blue-500/10 border border-blue-500/20">
                    <TrendingDown className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-blue-600 dark:text-blue-400">
                        {fuelName} at lowest share in {periodText}
                    </span>
                </div>
            );
        }

        // High milestone for renewables
        if (compact) {
            return (
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/20 text-primary">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{periodText} high!</span>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-gradient-to-r from-primary/10 to-emerald-500/10 border border-primary/20">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary font-medium">
                    {fuelName} at highest share in {periodText}! 🎉
                </span>
            </div>
        );
    }

    return null;
}
