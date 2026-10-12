import { useNavigate, NavigateOptions, To } from 'react-router-dom';
import { useCallback, startTransition } from 'react';

/**
 * Navigate helper for primary chrome (bottom/side nav).
 *
 * Uses startTransition so React keeps the outgoing page painted while the
 * next lazy route resolves — avoids a Suspense loader flash between tabs.
 *
 * AppLayout owns enter/exit motion. We intentionally do not wrap navigations
 * in document.startViewTransition: a root view-transition cross-fade fights
 * the directional slide and also animates the dock.
 */
export function useTransitionNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      startTransition(() => {
        if (typeof to === 'number') {
          navigate(to);
        } else {
          navigate(to, options);
        }
      });
    },
    [navigate]
  );
}
