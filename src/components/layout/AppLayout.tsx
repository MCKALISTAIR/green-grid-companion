import { useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { SideNav } from './SideNav';
import { AnimatedOutlet } from './AnimatedOutlet';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

/** Routes that own the full viewport — no dock / side nav chrome. */
function shouldHideChrome(pathname: string) {
  return pathname === '/onboarding' || pathname.startsWith('/auth');
}

export function AppLayout() {
  const shouldReduceMotion = useReducedMotion();
  const { pathname } = useLocation();
  const hideChrome = shouldHideChrome(pathname);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <div className="min-h-[100dvh] bg-background font-sans">
      {!hideChrome && <SideNav />}

      <div
        className={cn('flex flex-col min-h-[100dvh] overflow-x-hidden', !hideChrome && 'lg:pl-64')}
      >
        <main
          className={cn(
            'flex-1 w-full relative overflow-x-hidden',
            hideChrome ? 'max-w-none pb-0' : 'app-content max-w-7xl mx-auto',
            !hideChrome && pathname === '/' && 'app-content--home',
          )}
        >
          <AnimatedOutlet />
        </main>

        {!hideChrome && (
          <div className="lg:hidden">
            <BottomNav onHomeClick={handleScrollToTop} />
          </div>
        )}
      </div>
    </div>
  );
}
