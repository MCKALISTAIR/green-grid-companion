import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { fuelStyleVars } from '@/lib/fuelColors';
import { getFuelIcon } from './fuelIcons';
import { GustLinesIcon } from './GustLinesIcon';
import { fuelAnimationSeconds, isFuelIconAnimated } from './fuelMotion';


/** Pause CSS animations while the element is offscreen (cheap: one observer per chip). */
function useOnScreen<T extends Element>(enabled: boolean) {
  const ref = useRef<T>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);
  return [ref, onScreen] as const;
}

/**
 * Source icon inside a small tinted chip. The chip is the only tinted surface on a
 * card. Active sources (share > 0) get a subtle looping animation; sources at 0 stay
 * static and muted. Reduced motion (`animated={false}` or the OS setting) = static.
 */
export function FuelChip({
  fuel,
  perc,
  size = 'md',
  strong = false,
  animated = false,
}: {
  fuel: string;
  /** Share of the mix; 0 renders static + muted. Omit for a static legend swatch. */
  perc?: number;
  size?: 'sm' | 'md' | 'lg';
  strong?: boolean;
  animated?: boolean;
}) {
  const key = fuel.toLowerCase();
  const Icon = getFuelIcon(key);
  const muted = perc === 0;
  const anim = isFuelIconAnimated(key, perc, animated);
  const [ref, onScreen] = useOnScreen<HTMLSpanElement>(anim);
  const box = size === 'sm' ? 'w-5 h-5 rounded-md' : size === 'lg' ? 'w-9 h-9 rounded-xl' : 'w-8 h-8 rounded-lg';
  const icon = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const style = {
    ...fuelStyleVars(key, strong),
    ...(anim ? { '--fuel-anim-dur': `${fuelAnimationSeconds(perc ?? 0)}s` } : {}),
  } as CSSProperties;
  return (
    <span
      ref={ref}
      className={cn(
        box,
        'inline-flex items-center justify-center flex-shrink-0',
        'bg-[var(--fuel-chip)] dark:bg-[var(--fuel-chip-dark)] text-[var(--fuel-bar)] dark:text-[var(--fuel-bar-dark)]',
        muted && 'opacity-50 grayscale',
        anim && `fuel-anim fuel-anim--${key === 'interconnectors' ? 'imports' : key}`,
        anim && !onScreen && 'fuel-anim--paused',
      )}
      style={style}
      data-fuel-chip={key}
      data-animated={anim ? 'true' : 'false'}
    >
      {key === 'wind' ? (
        <GustLinesIcon className={icon} />
      ) : (
        <Icon className={cn(icon, 'fuel-anim__icon')} aria-hidden="true" />
      )}
    </span>
  );
}

/** Share bar: neutral rounded track, fuel-coloured rounded fill (the card's main colour carrier). */
export function FuelShareBar({ fuel, perc, className }: { fuel: string; perc: number; className?: string }) {
  const width = Math.max(0, Math.min(perc, 100));
  return (
    <div
      className={cn('h-1.5 w-full rounded-full overflow-hidden bg-[var(--bar-track)] dark:bg-[var(--bar-track-dark)]', className)}
      style={fuelStyleVars(fuel) as CSSProperties}
      role="presentation"
      data-share-bar={fuel.toLowerCase()}
    >
      <div
        className="h-full rounded-full bg-[var(--fuel-bar)] dark:bg-[var(--fuel-bar-dark)] transition-[width] duration-700 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
