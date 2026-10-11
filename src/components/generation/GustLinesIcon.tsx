import { cn } from '@/lib/utils';

/**
 * Wind icon: three short rounded gust strokes of different lengths that drift
 * a few px left to right and fade, staggered, on a slow ease-in-out loop.
 * Pure CSS (`.gust-line` in index.css); the parent FuelChip decides whether it
 * animates, sets the loop length and pauses it offscreen.
 */
export function GustLinesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={cn('gust-lines', className)}
      aria-hidden="true"
      data-testid="gust-lines-icon"
    >
      <path className="gust-line" d="M4 8h11" />
      <path className="gust-line gust-line--2" d="M3 12h16" />
      <path className="gust-line gust-line--3" d="M6 16h8" />
    </svg>
  );
}
