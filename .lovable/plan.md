

# GridSense: Stability, Resilience & Efficiency Audit

## Overall Verdict: Strong Foundation, Some Areas to Tighten

Your app is well-architected for a project of this scope. The patterns are mature and consistent. Below is a breakdown of strengths and areas for improvement.

---

## What You're Doing Well

**Error Handling**
- Two-tier error boundaries (global `ErrorBoundary` + per-component `ComponentErrorBoundary`) — excellent pattern
- `errorUtils.ts` provides contextual, user-friendly error messages for every integration (Octopus, Tesla, network, auth)
- Graceful degradation: if regional data fails, national data is shown with an `isDegraded` flag

**Data Freshness & Resilience**
- Smart refetch singleton aligns refreshes to National Grid's half-hour boundaries — avoids redundant polling
- `usePeriodicRefresh` catches stale data if timers miss
- React Query persistence to localStorage with 24h TTL provides offline resilience
- Workbox PWA caching with NetworkFirst strategy for APIs
- App resume handler forces data refresh on native platforms

**Logging & Monitoring**
- Centralized `logger` with environment-aware config (debug in dev, warn+ in prod)
- Sentry integration with breadcrumbs, platform tags, and session replay
- Almost no raw `console.log` in application code (only in test files)

**Settings Sync**
- Debounced writes, 48h periodic sync, reconnect-on-online retry, realtime cross-device sync
- Self-write detection to avoid feedback loops on realtime channel

**Code Quality**
- Lazy-loaded routes with Suspense fallbacks
- No swallowed catch blocks found
- Proper cleanup in useEffect hooks (abort flags, subscription cleanup)
- Vite `dedupe` config preventing duplicate React instances

---

## Areas for Improvement

### 1. Production Logging Noise (Low Risk, Easy Fix)
`useCarbonData.ts` line 138 calls `logger.info(...)` on every render with resolution details. In prod, `minLevel` is `warn`, so this is filtered. But if you ever lower the prod level, this would flood logs. Consider changing to `logger.debug`.

### 2. `useSettings` Has a Stale Closure Risk (Medium Risk)
The periodic sync interval (line 217) captures `settings` in its closure. If settings change between interval ticks, `syncToDatabase(settings)` may push a stale value. The debounced effect at line 181 mitigates this in practice, but the interval should use a ref for settings.

### 3. Missing `AbortController` on Fetch Calls (Low Risk)
`carbonApi.ts` fetch calls don't use `AbortController`. If a component unmounts during a fetch, the response is processed unnecessarily. React Query handles most of this, but explicit abort signals would be cleaner and prevent edge-case memory leaks.

### 4. `queryClient` Defined at Module Scope (Low Risk)
The `QueryClient` is created outside the component tree (line 76 of `App.tsx`). This is fine for single-page apps but means it survives hot module replacement in dev, which can cause stale query state during development. Not a production issue.

### 5. Index Page Has 15 `useEffect` Hooks (Maintenance Risk)
`Index.tsx` is 519 lines with many effects — notification scheduling, tour, periodic refresh, etc. Consider extracting a `useIndexPageEffects` composite hook to reduce cognitive load and make the page easier to maintain.

### 6. No Request Deduplication for Smart Prefetch (Low Risk)
`useSmartPrefetch` fires prefetch queries for all saved locations on every mount. `prefetchQuery` skips if data is fresh (within `staleTime`), so this is mostly safe, but logging "Queuing prefetch for N saved locations" on every page load adds noise.

### 7. Service Worker in Dev Mode (Already Handled)
Your `registerServiceWorker` correctly unregisters SWs and clears caches in dev mode — this is a common pitfall you've already addressed.

### 8. No Global Rate Limiting on Refetch (Low Risk)
If a user rapidly pulls-to-refresh, `refetch()` fires all 5 queries in parallel each time. Consider a simple throttle (e.g., ignore refetch calls within 10s of the last one).

---

## Recommended Actions (Priority Order)

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | Add refetch throttle to prevent rapid-fire API calls | ~15 min |
| 2 | Fix stale closure in `useSettings` periodic sync | ~10 min |
| 3 | Extract `Index.tsx` effects into a composite hook | ~30 min |
| 4 | Downgrade `useCarbonData` resolution log to `debug` | ~2 min |
| 5 | Add `AbortController` to `carbonApi.ts` fetch calls | ~20 min |

---

## Summary

The app is in good shape for production. Error handling, offline support, and data freshness strategies are mature. The main risks are maintenance-related (large Index page, stale closures) rather than stability-critical. The improvements above are incremental quality-of-life fixes, not urgent fires.

Shall I implement any of these improvements?

