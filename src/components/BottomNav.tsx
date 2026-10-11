import { useLocation } from 'react-router-dom';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { Home, Trophy, CalendarDays, Settings2, History } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  onHomeClick?: () => void;
}

type TabDef = { id: string; path: string; label: string; Icon: typeof Home; tour?: string };

export const NAV_TABS: TabDef[] = [
  { id: 'home', path: '/', label: 'Home', Icon: Home },
  { id: 'plan', path: '/planner', label: 'Plan', Icon: CalendarDays, tour: 'nav-plan' },
  { id: 'history', path: '/history', label: 'History', Icon: History, tour: 'nav-history' },
  { id: 'rank', path: '/map', label: 'Rank', Icon: Trophy, tour: 'nav-rank' },
  { id: 'settings', path: '/settings', label: 'Settings', Icon: Settings2 },
];

/**
 * Phone tab bar (spec §4.10): full width, frosted, 5 equal columns, primary
 * for the active tab, aria-current on it, selection haptic on change.
 */
export function BottomNav({ onHomeClick }: BottomNavProps) {
  const navigate = useTransitionNavigate();
  const location = useLocation();
  const { selection } = useHaptics();

  const handleClick = (path: string) => {
    if (path === location.pathname) {
      if (path === '/' && onHomeClick) onHomeClick();
      return;
    }
    void selection();
    navigate(path);
  };

  return (
    <nav
      id="bottom-nav"
      aria-label="Main"
      data-testid="bottom-nav"
      className="tab-bar fixed inset-x-0 bottom-0 z-50 border-t border-border pt-2 pb-[calc(8px+env(safe-area-inset-bottom))]"
    >
      <ul className="grid grid-cols-5">
        {NAV_TABS.map(({ id, path, label, Icon, tour }) => {
          const active = location.pathname === path;
          return (
            <li key={id}>
              <button
                type="button"
                data-tour={tour}
                aria-current={active ? 'page' : undefined}
                onClick={() => handleClick(path)}
                className={cn(
                  'flex min-h-[49px] w-full flex-col items-center justify-center gap-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.3 : 1.9} aria-hidden />
                <span className="text-[11px] font-bold leading-tight">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
