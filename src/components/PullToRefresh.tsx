import { useState, useRef, ReactNode } from 'react';
import { useHaptics } from '@/hooks/useHaptics';
import { TurbineLogo } from '@/components/TurbineLogo';

interface PullToRefreshProps {
    onRefresh: () => Promise<void> | void;
    children: ReactNode;
    disabled?: boolean;
}

export function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
    const [startY, setStartY] = useState(0);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { impactMedium } = useHaptics();

    const THRESHOLD = 120;
    const MAX_PULL = 160;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (disabled || isRefreshing) return;
        if (window.scrollY > 0) return;
        setStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (disabled || isRefreshing || startY === 0) return;
        if (window.scrollY > 0) {
            setStartY(0);
            setPullDistance(0);
            return;
        }
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > 0) {
            const damped = Math.min(diff * 0.5, MAX_PULL);
            setPullDistance(damped);
        }
    };

    const handleTouchEnd = async () => {
        if (disabled || isRefreshing) return;
        if (pullDistance > THRESHOLD) {
            impactMedium();
            setIsRefreshing(true);
            setPullDistance(THRESHOLD);
            try {
                await onRefresh();
            } catch (error) {
                console.error('PullToRefresh error:', error);
            } finally {
                setTimeout(() => {
                    setIsRefreshing(false);
                    setPullDistance(0);
                }, 500);
            }
        } else {
            setPullDistance(0);
        }
        setStartY(0);
    };

    // Blade spin: faster as you pull more; constant during refresh
    const bladeRotationDeg = pullDistance * 3;
    const refreshAnimDuration = isRefreshing ? 0.6 : null;

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative"
        >
            {/* Refresh Indicator */}
            <div
                className="fixed top-0 left-0 right-0 flex justify-center pointer-events-none z-50 transition-all duration-300"
                style={{
                    paddingTop: 'calc(max(env(safe-area-inset-top), 59px) + 1rem)',
                    transform: `translateY(${Math.max(pullDistance, isRefreshing ? THRESHOLD : 0) - 100}px)`,
                    opacity: Math.min(pullDistance / (THRESHOLD * 0.5), 1)
                }}
            >
                <div className="bg-background/90 backdrop-blur shadow-md rounded-full p-2 border border-border">
                    {/* Turbine blades spin proportionally to pull distance;
                        once refreshing, blades keep spinning via TurbineLogo's built-in animation. */}
                    <div
                        className="w-6 h-6 text-primary"
                        style={
                            isRefreshing
                                ? undefined
                                : {
                                      transform: `rotate(${pullDistance * 3}deg)`,
                                      transition: 'transform 0.05s linear',
                                  }
                        }
                    >
                        <TurbineLogo className={`w-6 h-6 ${isRefreshing ? '' : '[&_g]:!animate-none'}`} />
                    </div>
                </div>
            </div>

            {/* Main Content with transform */}
            <div
                style={{
                    transform: `translateY(${pullDistance}px)`,
                    transition: isRefreshing ? 'transform 0.3s ease' : 'transform 0.1s ease-out'
                }}
            >
                {children}
            </div>
        </div>
    );
}
