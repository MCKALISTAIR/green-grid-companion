import { useNavigate, NavigateOptions, To } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Custom wrapper around react-router's useNavigate hook that utilizes
 * the browser-native View Transitions API (document.startViewTransition)
 * if supported, providing smooth page/tab cross-fades.
 */
export function useTransitionNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      const doc = document as unknown as { startViewTransition?: (cb: () => void) => void };
      if (doc.startViewTransition && typeof to !== 'number') {
        doc.startViewTransition(() => {
          navigate(to, options);
        });
      } else {
        if (typeof to === 'number') {
          navigate(to);
        } else {
          navigate(to, options);
        }
      }
    },
    [navigate]
  );
}
