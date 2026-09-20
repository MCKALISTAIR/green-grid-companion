import { useLocation } from 'react-router-dom';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { Home, ListOrdered, Calendar, Settings, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, type Transition } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// Playful press feedback: icon dips + tilts on active, springs back on release.
const iconTilt =
    'transition-transform duration-150 ease-out group-active:scale-90 group-active:-rotate-6 motion-reduce:transform-none';

// Bouncy spring dynamics for sliding background pill
const pillTransition = { type: 'spring' as const, stiffness: 450, damping: 25 };

interface BottomNavProps {
    onHomeClick?: () => void;
}

export function BottomNav({ onHomeClick }: BottomNavProps) {
    const navigate = useTransitionNavigate();
    const location = useLocation();
    const { selection } = useHaptics();
    const shouldReduceMotion = useReducedMotion();

    const isActive = (path: string) => location.pathname === path;

    // Squish-bounce played once when a tab becomes active
    const squishBounce = {
      initial: false as const,
      animate: shouldReduceMotion ? {} : { scaleY: [1, 0.65, 1.25, 1] },
      transition: { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] } as Transition,
    };

    const handleHome = () => {
        selection();
        if (location.pathname === '/' && onHomeClick) {
            onHomeClick();
        } else {
            navigate('/');
        }
    };

    const tabClass = (active: boolean) =>
        `group relative z-10 flex flex-col items-center gap-0.5 h-auto py-2 px-1 rounded-xl transition-all ${
            active
                ? 'text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
        }`;

    return (
        <div id="bottom-nav" className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
            <div className="pointer-events-auto nav-dock max-w-md mx-auto">
                <div className="grid grid-cols-5 h-[3.85rem] px-1.5">

                    <Button
                        variant="ghost"
                        className={tabClass(isActive('/'))}
                        onClick={handleHome}
                    >
                        {isActive('/') && (
                            <motion.div
                                layoutId="bottom-nav-active-pill"
                                className="absolute inset-1 rounded-xl bg-primary/12 -z-10"
                                transition={pillTransition}
                            />
                        )}
                        <motion.span key={isActive('/') ? 'active' : 'idle'} {...squishBounce}>
                          <Home className={`w-5 h-5 ${iconTilt}`} />
                        </motion.span>
                        <span className="text-[10px] font-semibold tracking-wide">Home</span>
                    </Button>

                    <Button
                        variant="ghost"
                        data-tour="nav-plan"
                        className={tabClass(isActive('/planner'))}
                        onClick={() => { selection(); navigate('/planner'); }}
                    >
                        {isActive('/planner') && (
                            <motion.div
                                layoutId="bottom-nav-active-pill"
                                className="absolute inset-1 rounded-xl bg-primary/12 -z-10"
                                transition={pillTransition}
                            />
                        )}
                        <motion.span key={isActive('/planner') ? 'active' : 'idle'} {...squishBounce}>
                          <Calendar className={`w-5 h-5 ${iconTilt}`} />
                        </motion.span>
                        <span className="text-[10px] font-semibold tracking-wide">Plan</span>
                    </Button>

                    <Button
                        variant="ghost"
                        data-tour="nav-history"
                        className={tabClass(isActive('/history'))}
                        onClick={() => { selection(); navigate('/history'); }}
                    >
                        {isActive('/history') && (
                            <motion.div
                                layoutId="bottom-nav-active-pill"
                                className="absolute inset-1 rounded-xl bg-primary/12 -z-10"
                                transition={pillTransition}
                            />
                        )}
                        <motion.span key={isActive('/history') ? 'active' : 'idle'} {...squishBounce}>
                          <Clock className={`w-5 h-5 ${iconTilt}`} />
                        </motion.span>
                        <span className="text-[10px] font-semibold tracking-wide">History</span>
                    </Button>

                    <Button
                        variant="ghost"
                        data-tour="nav-rank"
                        className={tabClass(isActive('/map'))}
                        onClick={() => { selection(); navigate('/map'); }}
                    >
                        {isActive('/map') && (
                            <motion.div
                                layoutId="bottom-nav-active-pill"
                                className="absolute inset-1 rounded-xl bg-primary/12 -z-10"
                                transition={pillTransition}
                            />
                        )}
                        <motion.span key={isActive('/map') ? 'active' : 'idle'} {...squishBounce}>
                          <ListOrdered className={`w-5 h-5 ${iconTilt}`} />
                        </motion.span>
                        <span className="text-[10px] font-semibold tracking-wide">Rank</span>
                    </Button>

                    <Button
                        variant="ghost"
                        className={tabClass(isActive('/settings'))}
                        onClick={() => { selection(); navigate('/settings'); }}
                    >
                        {isActive('/settings') && (
                            <motion.div
                                layoutId="bottom-nav-active-pill"
                                className="absolute inset-1 rounded-xl bg-primary/12 -z-10"
                                transition={pillTransition}
                            />
                        )}
                        <motion.span key={isActive('/settings') ? 'active' : 'idle'} {...squishBounce}>
                          <Settings className={`w-5 h-5 ${iconTilt}`} />
                        </motion.span>
                        <span className="text-[10px] font-semibold tracking-wide">Settings</span>
                    </Button>

                </div>
            </div>
        </div>
    );
}
