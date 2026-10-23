import { useEffect, useState } from 'react';
import { classifyGridFailure } from '@/lib/upstreamOutage';

/** 'outage' | 'generic' for the current grid error; null while checking or no error. */
export function useGridFailureKind(isError: boolean, error: unknown) {
  const [kind, setKind] = useState<'outage' | 'generic' | null>(null);
  useEffect(() => {
    if (!isError) {
      setKind(null);
      return;
    }
    let live = true;
    void classifyGridFailure(error).then((k) => live && setKind(k));
    return () => {
      live = false;
    };
  }, [isError, error]);
  return kind;
}
