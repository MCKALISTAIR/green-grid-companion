import type { Transition, Variants } from 'framer-motion';

/** Shared easing — soft deceleration used across page and state transitions. */
export const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const pageTransition: Transition = {
  duration: 0.2,
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

export function createPageSlideVariants(reduceMotion: boolean): Variants {
  return {
    initial: (dir: SlideDir) => {
      if (reduceMotion) return { opacity: 0 };
      if (dir === 'right') return { x: '10%', opacity: 0 };
      if (dir === 'left') return { x: '-10%', opacity: 0 };
      return { opacity: 0, y: 8 };
    },
    animate: {
      x: 0,
      y: 0,
      opacity: 1,
    },
    exit: (dir: SlideDir) => {
      if (reduceMotion) return { opacity: 0 };
      if (dir === 'right') return { x: '-8%', opacity: 0 };
      if (dir === 'left') return { x: '8%', opacity: 0 };
      return { opacity: 0, y: -6 };
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
