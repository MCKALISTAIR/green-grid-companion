import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Scalloped edge between the hero and the sheet (spec §4.3): even circular
 * arcs of radius 12 across the full width, round(width / 24) of them, bumps
 * pointing up into the scene, 24 px tall, static.
 */
export function scallopPath(width: number, radius = 12): string {
  const count = Math.max(1, Math.round(width / (radius * 2)));
  const w = width / count;
  const r = w / 2;
  let d = `M0,24 L0,${24 - 0}`;
  for (let i = 0; i < count; i++) {
    const x1 = (i + 1) * w;
    // Arc height = r (a semicircle when w = 24); capped at the 24 px band.
    d += ` A${r},${Math.min(r, 24)} 0 0 1 ${x1},24`;
  }
  return `${d} Z`;
}

export function ScallopDivider({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(390);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const m = () => setW(Math.max(1, el.getBoundingClientRect().width));
    m();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(m);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} data-testid="scene-wave-divider" aria-hidden>
      <svg width="100%" height="24" viewBox={`0 0 ${w} 24`} preserveAspectRatio="none" className="block">
        <path d={scallopPath(w)} style={{ fill: 'hsl(var(--background))' }} />
      </svg>
    </div>
  );
}
