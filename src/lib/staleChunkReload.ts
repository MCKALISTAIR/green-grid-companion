/**
 * BH-131: after a deploy, the service worker (skipWaiting + clientsClaim +
 * cleanupOutdatedCaches) takes over an open tab and deletes the old precache.
 * The tab still runs the old index, so the next lazy route asks for an old
 * chunk hash that is gone, and the import fails ("Failed to fetch dynamically
 * imported module"). Vite fires `vite:preloadError` for this; reload once to
 * pick up the new index. A short guard stops a reload loop if the chunk is
 * genuinely missing.
 */
export const STALE_CHUNK_RELOAD_KEY = 'gridsense-stale-chunk-reload-at';
const GUARD_MS = 30_000;

export interface StaleChunkDeps {
  target: Pick<Window, 'addEventListener'>;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  reload: () => void;
  now?: () => number;
}

export function installStaleChunkReload(deps: StaleChunkDeps): void {
  const now = deps.now ?? Date.now;
  deps.target.addEventListener('vite:preloadError', (event: Event) => {
    let last = 0;
    try {
      last = Number(deps.storage.getItem(STALE_CHUNK_RELOAD_KEY) ?? 0);
    } catch {
      // storage blocked: still allow a reload below
    }
    if (now() - last < GUARD_MS) return; // already reloaded just now: let the error show
    event.preventDefault();
    try {
      deps.storage.setItem(STALE_CHUNK_RELOAD_KEY, String(now()));
    } catch {
      // ignore
    }
    deps.reload();
  });
}
