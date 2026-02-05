import { Leaf, TrendingDown, Trophy, Sparkles, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FuelStreak, formatStreakDuration } from '@/hooks/useFuelStreaks';
import { FuelMilestone } from '@/hooks/useFuelMilestones';
import { cn } from '@/lib/utils';

interface FuelInsightBadgeProps {
    streak?: FuelStreak;
    milestone?: FuelMilestone;
    compact?: boolean;
}

export function FuelInsightBadge({ streak, milestone, compact = false }: FuelInsightBadgeProps) {
    // Streak badge for fossil fuels at 0% - only show if we have meaningful data (>= 1 day)
    if (streak?.isActive && streak.days >= 1) {
        const duration = formatStreakDuration(streak.days, streak.hours, streak.exceededLookback);
        const fuelName = streak.fuel.charAt(0).toUpperCase() + streak.fuel.slice(1);
        
        const badgeContent = compact ? (
            <div className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                streak.isNewRecord
                    ? "bg-chart-4/20 text-chart-4"
                    : "bg-primary/20 text-primary"
            )}>
                {streak.isNewRecord ? (
                    <Trophy className="w-2.5 h-2.5" />
                ) : (
                    <Leaf className="w-2.5 h-2.5" />
                )}
                <span className="flex items-center gap-0.5">
                    {duration} {streak.fuel}-free
                    {streak.exceededLookback && <Info className="w-2.5 h-2.5 opacity-70" />}
                </span>
            </div>
        ) : (
            <div className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs",
                streak.isNewRecord
                    ? "bg-gradient-to-r from-chart-4/20 to-chart-5/20 border border-chart-4/30"
                    : "bg-primary/10 border border-primary/20"
            )}>
                {streak.isNewRecord ? (
                    <>
                        <Trophy className="w-3.5 h-3.5 text-chart-4" />
                        <span className="text-chart-4 font-medium">
                            New record! {duration} {streak.fuel}-free
                        </span>
                    </>
                ) : (
                    <>
                        <Leaf className="w-3.5 h-3.5 text-primary" />
                        <span className="text-primary">
                            {duration} without {streak.fuel}
                            {streak.exceededLookback && <Info className="w-3 h-3 ml-1 opacity-70 inline" />}
                        </span>
                    </>
                )}
            </div>
        );

        // Wrap in tooltip if streak exceeds the API lookback limit
        if (streak.exceededLookback) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {badgeContent}
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">This streak extends beyond the 30-day API limit</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }

        return badgeContent;
    }

    // Milestone badge for lows/highs
    if (milestone) {
        const fuelName = milestone.fuel.charAt(0).toUpperCase() + milestone.fuel.slice(1);
        const periodWeeks = Math.floor(milestone.periodDays / 7);
        const periodText = periodWeeks > 4 ? `${Math.floor(periodWeeks / 4)}mo` : `${periodWeeks}w`;

        if (milestone.type === 'low') {
            if (compact) {
                return (
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-chart-1/20 text-chart-1">
                        <TrendingDown className="w-2.5 h-2.5" />
                        <span>{periodText} low</span>
                    </div>
                );
            }

            return (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-chart-1/10 border border-chart-1/20">
                    <TrendingDown className="w-3.5 h-3.5 text-chart-1" />
                    <span className="text-chart-1">
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
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-gradient-to-r from-primary/10 to-chart-2/10 border border-primary/20">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary font-medium">
                    {fuelName} at highest share in {periodText}! 🎉
                </span>
            </div>
        );
    }

    return null;
}
