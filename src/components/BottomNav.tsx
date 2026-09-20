import { useLocation } from 'react-router-dom';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { Home, Trophy, CalendarDays, Settings2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, type Transition } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

const pillTransition = { type: 'spring' as const, stiffness: 450, damping: 25 };

interface BottomNavProps {
  onHomeClick?: () => void;
}

type TabDef = {
  id: string;
  path: string;
  label: string;
  Icon: typeof Home;
  pill: string;
  activeText: string;
  tour?: string;
};

const TABS: TabDef[] = [
  {
    id: 'home',
    path: '/',
    label: 'Home',
    Icon: Home,
    pill: 'bg-emerald-500/15',
    activeText: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'plan',
    path: '/planner',
    label: 'Plan',
    Icon: CalendarDays,
    pill: 'bg-sky-500/15',
    activeText: 'text-sky-600 dark:text-sky-400',
    tour: 'nav-plan',
  },
  {
    id: 'history',
    path: '/history',
    label: 'History',
    Icon: History,
    pill: 'bg-violet-500/15',
    activeText: 'text-violet-600 dark:text-violet-400',
    tour: 'nav-history',
  },
  {
    id: 'rank',
    path: '/map',
    label: 'Rank',
    Icon: Trophy,
    pill: 'bg-amber-500/15',
    activeText: 'text-amber-600 dark:text-amber-400',
    tour: 'nav-rank',
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Settings',
    Icon: Settings2,
    pill: 'bg-slate-500/15',
    activeText: 'text-slate-700 dark:text-slate-300',
  },
];

export function BottomNav({ onHomeClick }: BottomNavProps) {
  const navigate = useTransitionNavigate();
  const location = useLocation();
  const { selection } = useHaptics();
  const shouldReduceMotion = useReducedMotion();

  const isActive = (path: string) => location.pathname === path;

  const squishBounce = {
    initial: false as const,
    animate: shouldReduceMotion ? {} : { scaleY: [1, 0.65, 1.25, 1] },
    transition: { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] } as Transition,
  };

  const handleClick = (path: string) => {
    selection();
    if (path === '/' && location.pathname === '/' && onHomeClick) {
      onHomeClick();
      return;
    }
    navigate(path);
  };

  return (
    <div id="bottom-nav" className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="pointer-events-auto nav-dock max-w-md mx-auto">
        <div className="grid grid-cols-5 h-[3.85rem] px-1.5">
          {TABS.map(({ id, path, label, Icon, pill, activeText, tour }) => {
            const active = isActive(path);
            return (
              <Button
                key={id}
                variant="ghost"
                data-tour={tour}
                className={cn(
                  'group relative z-10 flex flex-col items-center gap-0.5 h-auto py-2 px-1 rounded-xl transition-all',
                  active
                    ? cn('font-bold', activeText)
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent',
                )}
                onClick={() => handleClick(path)}
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-active-pill"
                    className={cn('absolute inset-1 rounded-xl -z-10', pill)}
                    transition={pillTransition}
                  />
                )}
                <motion.span key={active ? `${id}-on` : `${id}-off`} {...squishBounce}>
                  <Icon
                    className={cn(
                      'w-[1.35rem] h-[1.35rem] transition-transform duration-150 ease-out group-active:scale-90 group-active:-rotate-6 motion-reduce:transform-none',
                      active && 'drop-shadow-sm',
                    )}
                    strokeWidth={active ? 2.4 : 1.85}
                    fill={active ? 'currentColor' : 'none'}
                    fillOpacity={active ? 0.18 : 0}
                  />
                </motion.span>
                <span className="text-[10px] font-semibold tracking-wide">{label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
