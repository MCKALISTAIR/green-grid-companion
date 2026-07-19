import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { SideNav } from './SideNav';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const TABS = ['/', '/planner', '/map', '/settings'];

export function AppLayout() {
    const location = useLocation();
    const shouldReduceMotion = useReducedMotion();
    
    // Direction tracking state
    const [lastPath, setLastPath] = useState(location.pathname);
    const [direction, setDirection] = useState<'right' | 'left' | 'fade'>('fade');

    const handleScrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Calculate transition direction
    const currentIndex = TABS.indexOf(location.pathname);
    if (location.pathname !== lastPath) {
        const lastIndex = TABS.indexOf(lastPath);
        if (currentIndex !== -1 && lastIndex !== -1) {
            setDirection(currentIndex > lastIndex ? 'right' : 'left');
        } else {
            setDirection('fade');
        }
        setLastPath(location.pathname);
    }

    // Variants for direction-aware tab sliding
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
            opacity: 1
        },
        exit: (dir: 'right' | 'left' | 'fade') => {
            if (shouldReduceMotion) return { opacity: 0 };
            if (dir === 'right') return { x: '-18%', opacity: 0 };
            if (dir === 'left') return { x: '18%', opacity: 0 };
            return { opacity: 0, y: -10 };
        }
    };

    return (
        <div className="min-h-[100vh] bg-background font-sans" style={{ minHeight: 'calc(100vh + env(safe-area-inset-top) + env(safe-area-inset-bottom))' }}>
            {/* Desktop Sidebar - Hidden on mobile */}
            <SideNav />

            {/* Main Content Area */}
            <div className="lg:pl-64 flex flex-col min-h-[100vh] overflow-x-hidden" style={{ minHeight: 'calc(100vh + env(safe-area-inset-top) + env(safe-area-inset-bottom))' }}>
                <main className="flex-1 w-full max-w-7xl mx-auto pb-24 lg:pb-0 relative">
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

                {/* Mobile Bottom Nav - Hidden on lg screens */}
                <div className="lg:hidden">
                    <BottomNav onHomeClick={handleScrollToTop} />
                </div>
            </div>
        </div>
    );
}
