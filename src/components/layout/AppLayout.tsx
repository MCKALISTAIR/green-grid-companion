import { Outlet, useLocation } from 'react-router-dom';
import { Suspense, useLayoutEffect, useRef } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { SideNav } from './SideNav';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getNavSlideDirection, type NavSlideDirection } from '@/lib/navTabs';
import { createPageSlideVariants, pageTransition } from '@/lib/motion';
import { PageLoader } from '@/components/ui/PageLoader';

export function AppLayout() {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const prevPathRef = useRef(location.pathname);
  const directionRef = useRef<NavSlideDirection>('fade');

  // Compute slide direction from the previous path before we overwrite it.
  // Must stay synchronous so AnimatePresence gets the correct `custom` on first paint.
  if (location.pathname !== prevPathRef.current) {
    directionRef.current = getNavSlideDirection(prevPathRef.current, location.pathname);
  }

  useLayoutEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth' });
  };

  const slideVariants = createPageSlideVariants(shouldReduceMotion);
  const direction = directionRef.current;

  return (
    <div className="min-h-[100dvh] bg-background font-sans">
      <SideNav />

      <div className="lg:pl-64 flex flex-col min-h-[100dvh] overflow-x-hidden">
        <main className="flex-1 w-full max-w-7xl mx-auto pb-28 lg:pb-0 relative">
          {/*
            Suspense sits outside the keyed motion node so a chunk miss does not
            remount a brand-new boundary on every tab (which forced a loader flash).
            startTransition in useTransitionNavigate also keeps the prior page up
            until the next lazy route is ready.
          */}
          <Suspense fallback={<PageLoader fullscreen={false} />}>
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={location.pathname}
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="w-full h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>

        <div className="lg:hidden">
          <BottomNav onHomeClick={handleScrollToTop} />
        </div>
      </div>
    </div>
  );
}
