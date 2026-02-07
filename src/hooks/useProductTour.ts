import { useEffect, useRef } from 'react';
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
            doneBtnText: 'Finish',
            nextBtnText: 'Next',
            prevBtnText: 'Back',
            steps: [
                {
                    element: '[data-tour="intensity-gauge"]',
                    popover: {
                        title: 'Live Carbon Intensity',
                        description: 'This dial shows the current carbon intensity of the National Grid. Lower is better!',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '[data-tour="forecast-chart"]',
                    popover: {
                        title: '24-Hour Forecast',
                        description: 'Plan ahead! See when the grid will be greenest over the next day.',
                        side: 'top',
                        align: 'center'
                    }
                },
                {
                    element: '[data-tour="generation-mix"]',
                    popover: {
                        title: 'Fuel Mix',
                        description: 'See exactly where your electricity is coming from right now (Wind, Solar, Gas, etc).',
                        side: 'top',
                        align: 'center'
                    }
                },
                {
                    element: '[data-tour="nav-plan"]',
                    popover: {
                        title: 'Power Planner',
                        description: 'Use the Planner to schedule your appliances for the cheapest and greenest times.',
                        side: 'top',
                        align: 'center'
                    }
                }
            ],
            onDestroyed: () => {
                // Mark tour as seen when finished or skipped
                localStorage.setItem('product_tour_seen', 'true');
            }
        });

        return () => {
            if (driverObj.current) {
                driverObj.current.destroy();
            }
        };
    }, []);

    const startTour = () => {
        // Only start if not seen and onboarding is complete
        const seen = localStorage.getItem('product_tour_seen');
        const onboardingComplete = localStorage.getItem('onboarding_complete');

        if (!seen && onboardingComplete === 'true') {
            // Small delay to ensure UI is rendered
            setTimeout(() => {
                driverObj.current?.drive();
            }, 1000);
        }
    };

    return { startTour };
}
