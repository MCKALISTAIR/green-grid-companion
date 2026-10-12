import { useNavigate, NavigateOptions, To } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Navigate helper for primary chrome (bottom/side nav).
 *
 * AppLayout owns page enter/exit with framer-motion. We intentionally do not
 * wrap navigations in document.startViewTransition here — a root view-transition
 * cross-fade fights the directional slide and also animates the dock, which
 * should stay put while content moves.
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
    [navigate]
  );
}
