import { useRef, useState, ReactNode } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';
import { PTR_THRESHOLD, PTR_HOLD, ptrResistance } from '@/lib/pullToRefreshMotion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TurbineLogo } from '@/components/TurbineLogo';
import { spring } from '@/lib/motion';
interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
}

function isAtTop(el: HTMLElement | null): boolean {
  if ((window.scrollY || document.scrollingElement?.scrollTop || 0) > 0) return false;
  // A nested scroller between the touch target and the container must also be at the top.
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.scrollTop > 0) return false;
  }
  return true;
}

/**
 * Pull-to-refresh driven by a motion value (no React state per frame, no CSS
 * transition while dragging), so the content tracks the finger exactly.
 * One Medium impact when the threshold is crossed; crossing back re-arms it
 * silently (max one haptic per gesture). No fixed delay after refresh.
 * Reduced motion: the content doesn't move and the turbine doesn't spin;
 * only the indicator fades in.
 */
export function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const reduced = useReducedMotion();
  const { impactMedium } = useHaptics();

  const d = useMotionValue(0);
  const startY = useRef<number | null>(null);
  const firedHaptic = useRef(false);
  const past = useRef(false);

  const indicatorY = useTransform(d, (v) => v - 100);
  const opacity = useTransform(d, [0, 40], [0, 1]);
  const rotate = useTransform(d, (v) => v * 3);
  const contentY = useTransform(d, (v) => (reduced ? 0 : v));

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    // React touch events bubble through portals, so a drag in a sheet, popover or
    // toast rendered outside this tree still reaches here. Only DOM descendants count.
    if (!(e.target instanceof Node) || !e.currentTarget.contains(e.target)) return;
    if (!isAtTop(e.target as HTMLElement)) return;
    startY.current = e.touches[0].clientY;
    firedHaptic.current = false;
    past.current = false;
    d.stop();
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null || disabled || isRefreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0 || !isAtTop(e.target as HTMLElement)) {
      if (dy <= 0) d.set(0);
      return;
    }
    const v = ptrResistance(dy);
    d.set(v);
    const nowPast = v >= PTR_THRESHOLD;
    if (nowPast && !past.current && !firedHaptic.current) {
      firedHaptic.current = true;
      impactMedium();
    }
    past.current = nowPast;
  };

  const settle = () => animate(d, 0, reduced ? { duration: 0.12 } : spring.snappy);

  const onTouchEnd = async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (disabled || isRefreshing) return;
    if (d.get() < PTR_THRESHOLD) {
      settle();
      return;
    }
    setIsRefreshing(true);
    animate(d, PTR_HOLD, reduced ? { duration: 0.12 } : spring.snappy);
    try {
      await onRefresh();
    } catch (error) {
      console.error('PullToRefresh error:', error);
    } finally {
      setIsRefreshing(false);
      settle();
    }
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      className="relative"
      data-testid="ptr-root"
    >
      <motion.div
        className="fixed top-0 left-0 right-0 flex justify-center pointer-events-none z-50"
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top), 59px) + 1rem)',
          y: indicatorY,
          opacity,
        }}
        data-testid="ptr-indicator"
        aria-hidden
      >
        <div className="bg-background/90 backdrop-blur shadow-md rounded-full p-2 border border-border">
          <motion.div
            className="w-6 h-6 text-primary"
            style={isRefreshing || reduced ? undefined : { rotate }}
          >
            <TurbineLogo
              className={`w-6 h-6 ${isRefreshing && !reduced ? '' : '[&_g]:!animate-none'}`}
            />
          </motion.div>
        </div>
      </motion.div>
      <span className="sr-only" role="status">
        {isRefreshing ? 'Refreshing' : ''}
      </span>

      <motion.div style={{ y: contentY }} data-testid="ptr-content">
        {children}
      </motion.div>
    </div>
  );
}
