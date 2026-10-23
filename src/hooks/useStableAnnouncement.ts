import { useRef } from 'react';

/**
 * Live-region text that only changes when `key` changes (Design call, #178).
 * Re-renders and clock ticks that produce new `text` under the same key keep
 * the first text, so screen readers aren't re-announced to.
 */
export function useStableAnnouncement(key: string, text: string): string {
  const held = useRef<{ key: string; text: string } | null>(null);
  if (held.current === null || held.current.key !== key) held.current = { key, text };
  return held.current.text;
}
