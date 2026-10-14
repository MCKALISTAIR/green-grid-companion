/**
 * One overlay at a time.
 *
 * Anything that pops up over the app uninvited (the privacy choice, the
 * first-launch tips/tour, the notification ask, other one-off popovers) asks
 * this queue for a turn instead of showing itself. Only one is active at once,
 * picked by priority: consent > tips > other. An active overlay keeps its turn
 * until it releases it; then the highest-priority waiting one goes next.
 *
 * Consent is special: while the user hasn't chosen yet (`setConsentPending`),
 * no lower-priority overlay may start, even if consent's sheet isn't on screen
 * yet (for example during its slide-in delay). Tips resume after the choice.
 *
 * Public API (also used by onboarding): `requestOverlay(kind, id?)`,
 * `useOverlayQueue()` / `useOverlayTurn()` in src/hooks/useOverlayQueue.ts.
 */

export type OverlayKind = 'consent' | 'tips' | 'other';

export const OVERLAY_PRIORITY: Record<OverlayKind, number> = {
  consent: 300,
  tips: 200,
  other: 100,
};

interface Entry {
  id: string;
  kind: OverlayKind;
  seq: number;
}

export interface OverlayHandle {
  id: string;
  kind: OverlayKind;
  /** True while this overlay has the turn. */
  isActive(): boolean;
  /** Runs `cb` as soon as this overlay gets its turn (immediately if it already has it). */
  whenActive(cb: () => void): () => void;
  /** Give the turn back (or leave the queue if still waiting). Safe to call twice. */
  release(): void;
}

export interface OverlayQueueState {
  active: { id: string; kind: OverlayKind } | null;
  waiting: { id: string; kind: OverlayKind }[];
  consentPending: boolean;
}

type Listener = () => void;

export function createOverlayQueue() {
  let seq = 0;
  let active: Entry | null = null;
  let waiting: Entry[] = [];
  let consentPending = false;
  const listeners = new Set<Listener>();
  const activeCallbacks = new Map<string, Set<() => void>>();
  let snapshot: OverlayQueueState = { active: null, waiting: [], consentPending: false };

  const rank = (e: Entry) => OVERLAY_PRIORITY[e.kind];

  function emit() {
    snapshot = {
      active: active ? { id: active.id, kind: active.kind } : null,
      waiting: waiting.map(({ id, kind }) => ({ id, kind })),
      consentPending,
    };
    listeners.forEach((l) => l());
  }

  function canStart(e: Entry) {
    return !consentPending || e.kind === 'consent';
  }

  function advance() {
    if (!active) {
      const next = waiting.filter(canStart).sort((a, b) => rank(b) - rank(a) || a.seq - b.seq)[0];
      if (next) {
        waiting = waiting.filter((e) => e !== next);
        active = next;
        const cbs = activeCallbacks.get(next.id);
        activeCallbacks.delete(next.id);
        cbs?.forEach((cb) => cb());
      }
    }
    emit();
  }

  function release(id: string) {
    activeCallbacks.delete(id);
    if (active?.id === id) active = null;
    else waiting = waiting.filter((e) => e.id !== id);
    advance();
  }

  function request(kind: OverlayKind, id: string = kind): OverlayHandle {
    const already = active?.id === id || waiting.some((e) => e.id === id);
    if (!already) {
      waiting.push({ id, kind, seq: seq++ });
      advance();
    }
    return {
      id,
      kind,
      isActive: () => active?.id === id,
      whenActive(cb) {
        if (active?.id === id) {
          cb();
          return () => {};
        }
        const set = activeCallbacks.get(id) ?? new Set();
        set.add(cb);
        activeCallbacks.set(id, set);
        return () => set.delete(cb);
      },
      release: () => release(id),
    };
  }

  return {
    request,
    release,
    /** Mark consent as undecided (true) or decided (false). Undecided blocks every other overlay. */
    setConsentPending(pending: boolean) {
      if (consentPending === pending) return;
      consentPending = pending;
      advance();
    },
    isActive: (id: string) => active?.id === id,
    getState: (): OverlayQueueState => snapshot,
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Tests only. */
    reset() {
      active = null;
      waiting = [];
      consentPending = false;
      activeCallbacks.clear();
      emit();
    },
  };
}

export type OverlayQueue = ReturnType<typeof createOverlayQueue>;

/** The app-wide queue. */
export const overlayQueue = createOverlayQueue();

/** Ask for a turn on the app-wide queue. */
export function requestOverlay(kind: OverlayKind, id?: string): OverlayHandle {
  return overlayQueue.request(kind, id);
}
