import { useEffect, useState } from 'react';
import { overlayQueue, type OverlayKind } from '@/lib/overlayQueue';

/**
 * Declarative turn for a component overlay: while `wanted` is true it waits in
 * the queue; returns true once it has the turn. Releases when `wanted` turns
 * false or the component unmounts.
 */
export function useOverlayTurn(kind: OverlayKind, wanted: boolean, id: string = kind): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!wanted) {
      setActive(false);
      return;
    }
    const handle = overlayQueue.request(kind, id);
    const stop = handle.whenActive(() => setActive(true));
    return () => {
      stop();
      handle.release();
      setActive(false);
    };
  }, [kind, id, wanted]);
  return active;
}
