import { useOutlet, useLocation } from 'react-router-dom';
import { useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getNavSlideDirection, type NavSlideDirection } from '@/lib/navTabs';
import { createPageSlideVariants, pageTransition } from '@/lib/motion';

/**
 * Captures the route element at mount so AnimatePresence can exit the
 * *previous* page while the new page enters. A live <Outlet /> would update
 * under the exiting node and both layers would show the new route.
 */
function FrozenRoute({ children }: { children: ReactNode }) {
  const [frozen] = useState(children);
  return <>{frozen}</>;
}

export function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const shouldReduceMotion = useReducedMotion();
  const prevPathRef = useRef(location.pathname);
  const directionRef = useRef<NavSlideDirection>('fade');

  if (location.pathname !== prevPathRef.current) {
    directionRef.current = getNavSlideDirection(prevPathRef.current, location.pathname);
    prevPathRef.current = location.pathname;
  }

  const slideVariants = createPageSlideVariants(shouldReduceMotion);
  const direction = directionRef.current;

  return (
    <AnimatePresence mode="sync" initial={false} custom={direction}>
      <motion.div
        key={location.pathname}
        custom={direction}
        variants={slideVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        className="w-full min-h-full"
      >
        <FrozenRoute>{outlet}</FrozenRoute>
      </motion.div>
    </AnimatePresence>
  );
}
