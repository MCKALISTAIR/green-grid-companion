import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { buildProductTourSteps } from '@/data/product-tour';
import { readTone } from '@/lib/tone';
import { isNationalMode } from '@/lib/postcode';
import { requestOverlay, type OverlayHandle } from '@/lib/overlayQueue';

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

  const steps = buildProductTourSteps({
    tone: readTone(),
    national: isNationalMode(localStorage.getItem('gridgreen-postcode')),
  });
  return steps.map((step) => {
    if (typeof step.element === 'string' && step.element.includes('nav-')) {
      return {
        ...step,
        element: `${navPrefix} ${step.element}`,
      };
    }
    return step;
  });
}

function createTourDriver(onDone: () => void) {
  return driver({
    showProgress: false,
    animate: true,
    stagePadding: 12,
    stageRadius: 16,
    popoverOffset: 16,
    allowClose: true,
    // "previous" is reused as "Skip tips"; there's nothing to go back to in a 2-tip tour.
    showButtons: ['previous', 'next'],
    doneBtnText: 'Done',
    nextBtnText: 'Next',
    prevBtnText: 'Skip tips',
    popoverClass: 'gridsense-tour-popover',
    steps: buildViewportAwareSteps(),
    onPopoverRender: (popover, { driver: d }) => {
      if (d.isLastStep()) {
        popover.previousButton.style.display = 'none';
      } else {
        popover.previousButton.disabled = false;
        popover.previousButton.classList.remove('driver-popover-btn-disabled');
      }
    },
    onPrevClick: (_el, _step, { driver: d }) => {
      d.destroy();
    },
    onDestroyed: () => {
      localStorage.setItem('product_tour_seen', 'true');
      onDone();
    },
  });
}

export function useProductTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const driverObj = useRef<ReturnType<typeof driver> | null>(null);
  const lastIsMobile = useRef<boolean | null>(null);
  // The tips take a turn in the shared overlay queue (after the privacy choice).
  const turn = useRef<OverlayHandle | null>(null);
  const rebuilding = useRef(false);
  const releaseTurn = useCallback(() => {
    if (rebuilding.current) return;
    turn.current?.release();
    turn.current = null;
  }, []);

  const rebuildDriver = useCallback(() => {
    const isMobile = window.innerWidth < LG_BREAKPOINT;
    // Skip rebuild if the nav target has not crossed the breakpoint
    if (lastIsMobile.current === isMobile && driverObj.current) {
      return;
    }
    lastIsMobile.current = isMobile;

    const wasActive = driverObj.current?.isActive?.() ?? false;
    rebuilding.current = wasActive; // keep our overlay turn across a rebuild
    driverObj.current?.destroy();
    rebuilding.current = false;
    driverObj.current = createTourDriver(releaseTurn);

    // If a tour was mid-flight when the viewport crossed lg (fold/unfold / rotate),
    // restart from the beginning with correct anchors rather than pointing at hidden nav.
    if (wasActive) {
      driverObj.current.drive();
    }
  }, [releaseTurn]);

  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      if (!driverObj.current) return;
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
      turn.current?.release();
      turn.current = null;
    };
  }, [rebuildDriver]);

  const runWhenOurTurn = useCallback(
    (delayMs: number) => {
      if (turn.current) return; // already waiting or running
      const handle = requestOverlay('tips', 'product-tour');
      turn.current = handle;
      handle.whenActive(() => {
        setTimeout(() => {
          if (turn.current !== handle) return;
          rebuildDriver();
          driverObj.current?.drive();
          if (driverObj.current?.isActive?.()) sessionStorage.removeItem('product_tour_replay');
          if (!driverObj.current?.isActive?.()) releaseTurn(); // nothing to show
        }, delayMs);
      });
    },
    [rebuildDriver, releaseTurn],
  );

  const startTour = useCallback(() => {
    if (location.pathname !== '/') return;
    const seen = localStorage.getItem('product_tour_seen');
    const onboardingComplete = localStorage.getItem('onboarding_complete');
    const replayPending = sessionStorage.getItem('product_tour_replay') === 'true';

    if (replayPending || (!seen && onboardingComplete === 'true')) {
      runWhenOurTurn(TOUR_START_DELAY_MS);
    }
  }, [runWhenOurTurn, location.pathname, location.key]);

  const replayTour = useCallback(() => {
    sessionStorage.setItem('product_tour_replay', 'true');
    navigate('/', { state: { startProductTour: true } });
  }, [navigate]);

  return { startTour, replayTour };
}
