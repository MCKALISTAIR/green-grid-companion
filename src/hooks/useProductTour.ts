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
        // Driver.js struggles when multiple elements match the same CSS selector (like when 
        // a mobile BottomNav and desktop SideNav both render but one is hidden via CSS).
        // To fix this, we map over the base steps and prefix navigation selectors 
        // strictly based on the current viewport width when the tour initializes.
        const isMobile = window.innerWidth < 1024; // Tailwind 'lg' breakpoint matches SideNav visibility
        const navPrefix = isMobile ? '#bottom-nav' : '#side-nav';

        const viewportAwareSteps = PRODUCT_TOUR_STEPS.map(step => {
            if (typeof step.element === 'string' && step.element.includes('nav-')) {
                // Prepend the active navigation container's ID to strictly target the visible element
                return {
                    ...step,
                    element: `${navPrefix} ${step.element}`
                };
            }
            return step;
        });

        driverObj.current = driver({
            showProgress: true,
            animate: true,
            allowClose: true,
            doneBtnText: 'Got it!',
            nextBtnText: 'Next →',
            prevBtnText: '← Back',
            popoverClass: 'gridsense-tour-popover',
            steps: viewportAwareSteps,
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
