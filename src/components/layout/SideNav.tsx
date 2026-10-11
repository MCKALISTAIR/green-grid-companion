import { useLocation } from 'react-router-dom';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { TurbineLogo } from '@/components/TurbineLogo';
import { NAV_TABS } from '@/components/BottomNav';
import { useHaptics } from '@/hooks/useHaptics';
import { COPY } from '@/lib/homeCopy';
import { cn } from '@/lib/utils';

/** Desktop side nav (spec §4.11): 232 px, white, logo row, five items, NESO credit pinned bottom. */
export function SideNav() {
  const navigate = useTransitionNavigate();
  const location = useLocation();
  const { selection } = useHaptics();

  return (
    <aside id="side-nav" className="fixed inset-y-0 left-0 z-50 hidden w-[232px] flex-col border-r border-border bg-card px-3 py-5 lg:flex">
      <div className="flex items-center gap-2.5 px-2">
        <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-primary text-primary-foreground">
          <TurbineLogo className="h-5 w-5" />
        </span>
        <span className="text-[19px] font-extrabold tracking-[-0.01em]">GridSense</span>
      </div>
      <nav aria-label="Main" className="mt-6">
        <ul className="space-y-1">
          {NAV_TABS.map(({ id, path, label, Icon, tour }) => {
            const active = location.pathname === path;
            return (
              <li key={id}>
                <button
                  type="button"
                  data-tour={tour}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    if (active) return;
                    void selection();
                    navigate(path);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[12px] px-3 py-[11px] text-[14.5px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'bg-primary-soft text-primary' : 'text-foreground/80 hover:bg-muted',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="mt-auto px-2 text-[12px] font-semibold leading-[1.4] text-muted-foreground">{COPY.credit}</p>
    </aside>
  );
}
