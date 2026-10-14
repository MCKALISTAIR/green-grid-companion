import { useNavigate, NavigateOptions, To } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Navigate helper for primary chrome (bottom/side nav).
 *
 * AppLayout's AnimatedOutlet owns enter/exit with framer-motion. We do not wrap
 * navigations in startTransition — concurrent deferred updates skip
 * AnimatePresence exit frames, which reads as a hard cut. Chunk warmth comes
 * from idle + hover prefetch instead.
 *
 * We also skip document.startViewTransition: a root cross-fade fights the
 * directional slide and animates the dock.
 */
export function useTransitionNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigate(to);
      } else {
        navigate(to, options);
      }
    },
    [navigate],
  );
}
