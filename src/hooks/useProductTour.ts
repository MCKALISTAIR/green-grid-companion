import { useCallback, useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { logger } from '@/lib/logger';
import { PRODUCT_TOUR_STEPS } from '@/data/product-tour';

// Wait for page elements to render and settle before starting the tour
const TOUR_START_DELAY_MS = 1000;

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
            steps: PRODUCT_TOUR_STEPS,
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
            }, TOUR_START_DELAY_MS);
        }
    }, []);

    const replayTour = useCallback(() => {
        // Force tour to start regardless of localStorage state
        setTimeout(() => {
            driverObj.current?.drive();
        }, 300);
    }, []);

    return { startTour, replayTour };
}
