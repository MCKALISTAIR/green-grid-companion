import { useCallback, useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { logger } from '@/lib/logger';

export function useProductTour() {
    const driverObj = useRef<ReturnType<typeof driver> | null>(null);

    useEffect(() => {
        driverObj.current = driver({
            showProgress: true,
            animate: true,
            allowClose: true,
            doneBtnText: 'Got it!',
            nextBtnText: 'Next →',
            prevBtnText: '← Back',
            popoverClass: 'gridsense-tour-popover',
            steps: [
                {
                    element: '[data-tour="intensity-gauge"]',
                    popover: {
                        title: '⚡ Live Carbon Intensity',
                        description: 'This shows the real-time carbon intensity for your region. The lower the number, the greener the grid!',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '[data-tour="forecast-chart"]',
                    popover: {
                        title: '📊 24-Hour Forecast',
                        description: 'Plan your energy usage! This chart shows when the grid will be at its greenest over the next 24 hours.',
                        side: 'top',
                        align: 'center'
                    }
                },
                {
                    element: '[data-tour="generation-mix"]',
                    popover: {
                        title: '🔋 Generation Mix',
                        description: 'A live breakdown of where your electricity is coming from — wind, solar, gas, nuclear and more.',
                        side: 'top',
                        align: 'center'
                    }
                },
                {
                    element: '[data-tour="nav-plan"]',
                    popover: {
                        title: '🗓️ Power Planner',
                        description: 'Schedule your appliances to run at the cheapest and greenest times automatically.',
                        side: 'top',
                        align: 'center'
                    }
                },
                {
                    element: '[data-tour="nav-history"]',
                    popover: {
                        title: '📜 Intensity History',
                        description: 'Browse past carbon intensity data to spot patterns and see how the grid has performed over time.',
                        side: 'top',
                        align: 'center'
                    }
                },
                {
                    element: '[data-tour="nav-rank"]',
                    popover: {
                        title: '🏆 Regional Rankings',
                        description: 'Compare carbon intensity across all UK regions and see how your area stacks up right now.',
                        side: 'top',
                        align: 'center'
                    }
                },
                {
                    element: '[data-tour="view-footprint"]',
                    popover: {
                        title: '🌱 Your Carbon Footprint',
                        description: 'Link your Octopus Energy account to unlock personalised carbon tracking — see your daily emissions, green energy percentage, and savings tips.',
                        side: 'bottom',
                        align: 'center'
                    }
                }
            ],
            onDestroyed: () => {
                localStorage.setItem('product_tour_seen', 'true');
            }
        });

        return () => {
            if (driverObj.current) {
                driverObj.current.destroy();
            }
        };
    }, []);

    const startTour = useCallback(() => {
        const seen = localStorage.getItem('product_tour_seen');
        const onboardingComplete = localStorage.getItem('onboarding_complete');

        if (!seen && onboardingComplete === 'true') {
            setTimeout(() => {
                driverObj.current?.drive();
            }, 1000);
        }
    }, []);

    return { startTour };
}
