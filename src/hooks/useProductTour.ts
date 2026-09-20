import { useCallback, useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { PRODUCT_TOUR_STEPS } from '@/data/product-tour';

// Wait for page elements to render and settle before starting the tour
const TOUR_START_DELAY_MS = 1000;
const LG_BREAKPOINT = 1024; // Matches SideNav / BottomNav Tailwind `lg` split

function buildViewportAwareSteps() {
    // Driver.js struggles when multiple elements match the same CSS selector (like when
    // a mobile BottomNav and desktop SideNav both render but one is hidden via CSS).
    // Prefix navigation selectors based on the *current* viewport — must be re-evaluated
    // on resize so fold/unfold (e.g. iPhone Duo) does not leave stale anchors.
    const isMobile = window.innerWidth < LG_BREAKPOINT;
    const navPrefix = isMobile ? '#bottom-nav' : '#side-nav';

    return PRODUCT_TOUR_STEPS.map(step => {
        if (typeof step.element === 'string' && step.element.includes('nav-')) {
            return {
                ...step,
                element: `${navPrefix} ${step.element}`
            };
        }
        return step;
    });
}

function createTourDriver() {
    return driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        doneBtnText: 'Got it!',
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        popoverClass: 'gridsense-tour-popover',
        steps: buildViewportAwareSteps(),
        onDestroyed: () => {
            localStorage.setItem('product_tour_seen', 'true');
        }
    });
}

export function useProductTour() {
    const driverObj = useRef<ReturnType<typeof driver> | null>(null);
    const lastIsMobile = useRef<boolean | null>(null);

    const rebuildDriver = useCallback(() => {
        const isMobile = window.innerWidth < LG_BREAKPOINT;
        // Skip rebuild if the nav target has not crossed the breakpoint
        if (lastIsMobile.current === isMobile && driverObj.current) {
            return;
        }
        lastIsMobile.current = isMobile;

        const wasActive = driverObj.current?.isActive?.() ?? false;
        driverObj.current?.destroy();
        driverObj.current = createTourDriver();

        // If a tour was mid-flight when the viewport crossed lg (fold/unfold / rotate),
        // restart from the beginning with correct anchors rather than pointing at hidden nav.
        if (wasActive) {
            driverObj.current.drive();
        }
    }, []);

    useEffect(() => {
        rebuildDriver();

        let resizeTimer: ReturnType<typeof setTimeout> | undefined;
        const onResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(rebuildDriver, 150);
        };

        window.addEventListener('resize', onResize);
        // visualViewport fires on some foldable / keyboard size changes where window.resize is quiet
        window.visualViewport?.addEventListener('resize', onResize);

        return () => {
            clearTimeout(resizeTimer);
            window.removeEventListener('resize', onResize);
            window.visualViewport?.removeEventListener('resize', onResize);
            driverObj.current?.destroy();
            driverObj.current = null;
        };
    }, [rebuildDriver]);

    const startTour = useCallback(() => {
        const seen = localStorage.getItem('product_tour_seen');
        const onboardingComplete = localStorage.getItem('onboarding_complete');

        if (!seen && onboardingComplete === 'true') {
            setTimeout(() => {
                rebuildDriver();
                driverObj.current?.drive();
            }, TOUR_START_DELAY_MS);
        }
    }, [rebuildDriver]);

    const replayTour = useCallback(() => {
        setTimeout(() => {
            rebuildDriver();
            driverObj.current?.drive();
        }, 300);
    }, [rebuildDriver]);

    return { startTour, replayTour };
}
