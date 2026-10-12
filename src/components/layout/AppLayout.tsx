import { Suspense } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { SideNav } from './SideNav';
import { AnimatedOutlet } from './AnimatedOutlet';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { PageLoader } from '@/components/ui/PageLoader';

export function AppLayout() {
  const shouldReduceMotion = useReducedMotion();

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <div className="min-h-[100dvh] bg-background font-sans">
      <SideNav />

      <div className="lg:pl-64 flex flex-col min-h-[100dvh] overflow-x-hidden">
        <main className="flex-1 w-full max-w-7xl mx-auto pb-28 lg:pb-0 relative overflow-x-hidden">
          {/*
            Suspense outside AnimatedOutlet so a chunk miss does not remount
            the motion boundary. startTransition in useTransitionNavigate keeps
            the prior page painted until the next lazy route is ready.
          */}
          <Suspense fallback={<PageLoader fullscreen={false} />}>
            <AnimatedOutlet />
          </Suspense>
        </main>

        <div className="lg:hidden">
          <BottomNav onHomeClick={handleScrollToTop} />
        </div>
      </div>
    </div>
  );
}
