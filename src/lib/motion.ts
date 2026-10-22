import type { Transition, Variants } from 'framer-motion';

/** Shared easing — soft deceleration used across page and state transitions. */
export const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** CSS cubic-bezier string matching `easeOutExpo` (dialogs, sheets, Tailwind). */
export const easeOutExpoCss = 'cubic-bezier(0.16, 1, 0.3, 1)';

/** Overlay open/close duration in ms — aligned with `stateTransition`. */
export const overlayDurationMs = 220;

export const pageTransition: Transition = {
  duration: 0.28,
  ease: easeOutExpo,
};

export const stateTransition: Transition = {
  duration: 0.22,
  ease: easeOutExpo,
};

export const quickFade: Transition = {
  duration: 0.16,
  ease: 'easeOut',
};

type SlideDir = 'right' | 'left' | 'fade';

/**
 * Page enter/exit. Exit is absolutely positioned so enter/exit can overlap
 * (AnimatePresence mode="sync") without a blank white gap between pages.
 */
export function createPageSlideVariants(reduceMotion: boolean): Variants {
  const exitLayout = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
  };

  return {
    initial: (dir: SlideDir) => {
      if (reduceMotion) return { opacity: 0 };
      if (dir === 'right') return { x: '12%', opacity: 0 };
      if (dir === 'left') return { x: '-12%', opacity: 0 };
      return { opacity: 0, y: 8 };
    },
    animate: {
      x: 0,
      y: 0,
      opacity: 1,
      position: 'relative',
    },
    exit: (dir: SlideDir) => {
      if (reduceMotion) return { ...exitLayout, opacity: 0 };
      if (dir === 'right') return { ...exitLayout, x: '-10%', opacity: 0 };
      if (dir === 'left') return { ...exitLayout, x: '10%', opacity: 0 };
      return { ...exitLayout, opacity: 0, y: -6 };
    },
  };
}

/** Horizontal state swap (e.g. Intensity → Demand → Footprint). */
export function createHorizontalStateVariants(reduceMotion: boolean): Variants {
  return {
    initial: (dir: 1 | -1 | 0) => {
      if (reduceMotion || dir === 0) return { opacity: 0 };
      return { opacity: 0, x: dir * 18 };
    },
    animate: { opacity: 1, x: 0 },
    exit: (dir: 1 | -1 | 0) => {
      if (reduceMotion || dir === 0) return { opacity: 0 };
      return { opacity: 0, x: dir * -14 };
    },
  };
}

/* ── Motion spec v1 tokens (§1). Prefer these over inline literals. ── */
export const dur = {
  pressIn: 0.09,
  pressOut: 0.16,
  fast: 0.16,
  /** Hero headline swap: 200ms opacity-only fade (approved, keep). */
  hero: 0.2,
  base: 0.22,
  page: 0.28,
  /** Reduced-motion replacement for any translate/scale/spring. */
  reduced: 0.12,
} as const;

export const ease = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  in: [0.4, 0, 1, 1] as [number, number, number, number],
  ios: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

export const spring = {
  snappy: { type: 'spring' as const, stiffness: 500, damping: 32, mass: 1 },
  sheet: { type: 'spring' as const, stiffness: 380, damping: 36 },
  number: { type: 'spring' as const, stiffness: 170, damping: 26 },
  bounce: { type: 'spring' as const, stiffness: 420, damping: 18 },
};
