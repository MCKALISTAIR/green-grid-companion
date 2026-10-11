import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { SideNav } from './SideNav';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const TABS = ['/', '/planner', '/history', '/map', '/settings'];

export function AppLayout() {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const [lastPath, setLastPath] = useState(location.pathname);
  const [direction, setDirection] = useState<'right' | 'left' | 'fade'>('fade');

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (location.pathname === lastPath) return;

    const currentIndex = TABS.indexOf(location.pathname);
    const lastIndex = TABS.indexOf(lastPath);

    if (currentIndex !== -1 && lastIndex !== -1) {
      setDirection(currentIndex > lastIndex ? 'right' : 'left');
    } else {
      setDirection('fade');
    }
    setLastPath(location.pathname);
  }, [location.pathname, lastPath]);

  const slideVariants = {
    initial: (dir: 'right' | 'left' | 'fade') => {
      if (shouldReduceMotion) return { opacity: 0 };
      if (dir === 'right') return { x: '18%', opacity: 0 };
      if (dir === 'left') return { x: '-18%', opacity: 0 };
      return { opacity: 0, y: 10 };
    },
    animate: {
      x: 0,
      y: 0,
      opacity: 1,
    },
    exit: (dir: 'right' | 'left' | 'fade') => {
      if (shouldReduceMotion) return { opacity: 0 };
      if (dir === 'right') return { x: '-18%', opacity: 0 };
      if (dir === 'left') return { x: '18%', opacity: 0 };
      return { opacity: 0, y: -10 };
    },
  };

  return (
    <div className="min-h-[100dvh] bg-background font-sans">
      <SideNav />

      <div className="lg:pl-[232px] flex flex-col min-h-[100dvh] overflow-x-hidden">
        {/* Bottom padding = tab bar (~57 px + safe area) + 16 (spec §4.10). */}
        <main className="flex-1 w-full mx-auto pb-[calc(73px+env(safe-area-inset-bottom))] lg:pb-0 relative">
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.div
              key={location.pathname}
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <div className="lg:hidden">
          <BottomNav onHomeClick={handleScrollToTop} />
        </div>
      </div>
    </div>
  );
}
