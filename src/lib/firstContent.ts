/**
 * "First meaningful content has painted" signal for the splash (motion spec §2.5).
 * The home screen calls signalFirstContent() once it has a reading to show
 * (fresh or from the persisted query cache); the splash fades as soon as it hears it.
 */
let signalled = false;
const listeners = new Set<() => void>();

export function signalFirstContent(): void {
  if (signalled) return;
  signalled = true;
  listeners.forEach((l) => l());
  listeners.clear();
}

export function onFirstContent(cb: () => void): () => void {
  if (signalled) {
    cb();
    return () => {};
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Test helper. */
export function resetFirstContentForTests(): void {
  signalled = false;
  listeners.clear();
}
