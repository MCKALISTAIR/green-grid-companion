import { ThemeProvider } from '@/components/ThemeProvider';
import { BadgeSeenOnRoute } from '@/components/BadgeSeenOnRoute';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useCapacitor } from '@/hooks/useCapacitor';
import { useEffect, lazy, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { registerServiceWorker } from '@/hooks/useOffline';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSmartPrefetch } from '@/hooks/useSmartPrefetch';
import ScrollToTop from '@/components/ScrollToTop';
import { logger } from '@/lib/logger';
import { AchievementManager } from '@/components/AchievementManager';
import { DirectorPanel } from '@/components/DirectorPanel';
import { SceneDirectorProvider } from '@/components/SceneDirectorProvider';
import { StatusBarManager } from '@/components/StatusBarManager';
import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';
import { SplashScreen } from '@/components/SplashScreen';
import { DeepLinkHandler } from '@/components/DeepLinkHandler';
import { CookieConsent } from '@/components/CookieConsent';
import { LocationProvider } from '@/contexts/LocationContext';
import { HelmetProvider } from 'react-helmet-async';
import { RouteMetadata } from '@/components/RouteMetadata';

// Primary tabs are eager so dock/side-nav switches never suspend mid-slide.
import Index from './pages/Index';
import Planner from './pages/Planner';
import MapPage from './pages/Map';
import Settings from './pages/Settings';
import HistoryPage from './pages/History';

// Secondary pages stay lazy
const Onboarding = lazy(() => import('./pages/Onboarding'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const Support = lazy(() => import('./pages/Support'));
const Glossary = lazy(() => import('./pages/Glossary'));
const ManageLocations = lazy(() => import('./pages/ManageLocations'));
const Changelog = lazy(() => import('./pages/Changelog'));
const Help = lazy(() => import('./pages/Help'));
const FeatureGuides = lazy(() => import('./pages/FeatureGuides'));
const GuideDetail = lazy(() => import('./pages/GuideDetail'));
const NotFound = lazy(() => import('./pages/NotFound'));
// Dev/QA pages (/__turbine-test, /__scene-test, /__design-system) exist only in
// dev builds (`vite` / `vite build --mode development`), or when a build sets
// VITE_ENABLE_DEV_ROUTES=true (the CI a11y audit does, to keep auditing
// /__design-system). In the Lovable production build neither is true, so the
// routes are not registered, the page chunks are dropped from the bundle, and
// those URLs fall through to NotFound.
const DEV_ROUTES_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_ROUTES === 'true';
const TurbineTest = DEV_ROUTES_ENABLED ? lazy(() => import('./pages/TurbineTest')) : null;
const SceneTestPage = DEV_ROUTES_ENABLED ? lazy(() => import('./pages/SceneTest')) : null;
const DesignSystemPage = DEV_ROUTES_ENABLED ? lazy(() => import('./pages/DesignSystem')) : null;
const ChargingHistory = lazy(() => import('./pages/ChargingHistory'));
const AchievementsPage = lazy(() => import('./pages/Achievements'));
import AuthCallback from './pages/AuthCallback';
import { RESUME_REFETCH_KEYS } from '@/lib/resumeRefetch';
import { QUERY_CACHE_BUSTER } from '@/lib/version';
import { markCarbonDataRefreshed } from '@/hooks/usePeriodicRefresh';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache data for 24 hours to survive app restarts / offline
      gcTime: 1000 * 60 * 60 * 24,
      // Retry failed requests
      retry: 2,
      // Refetch on window focus
      refetchOnWindowFocus: true,
      // Refetch when reconnecting to network
      refetchOnReconnect: true,
      // Only refetch on mount if data is stale (respects staleTime)
      refetchOnMount: true,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'gridsense-query-cache',
  // Throttle writes to 2s to avoid perf impact
  throttleTime: 2000,
});

function AppContent() {
  const [showSplash, setShowSplash] = useState(() => {
    const hasShownSession = sessionStorage.getItem('gridsense-splash-shown') === 'true';
    if (hasShownSession) {
      return false;
    }
    return localStorage.getItem('skip_splash') !== 'true';
  });

  const handleSplashComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem('gridsense-splash-shown', 'true');
  };

  // Initialize Capacitor for native platforms
  useCapacitor();

  // Smart prefetch saved locations in the background
  useSmartPrefetch();

  // Register service worker for offline support
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Listen for App Resume (coming from background)
  useEffect(() => {
    const handleAppStateChange = async (state: { isActive: boolean }) => {
      if (state.isActive) {
        logger.info('App resumed, refreshing carbon data');
        markCarbonDataRefreshed();
        // Force refetch of critical carbon data queries regardless of stale time
        await Promise.all(
          RESUME_REFETCH_KEYS.map((queryKey) =>
            queryClient.refetchQueries({ queryKey: [...queryKey], type: 'active' }),
          ),
        );
      }
    };

    const subscription = CapacitorApp.addListener('appStateChange', handleAppStateChange);

    return () => {
      subscription.then((handle) => handle.remove());
    };
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <OfflineIndicator />
      {/* Position/offset live in ui/sonner.tsx: bottom above the dock on phones, top on desktop. */}
      <Sonner />
      <BrowserRouter>
        <RouteMetadata />
        <ComponentErrorBoundary name="Status Bar Manager">
          <StatusBarManager />
        </ComponentErrorBoundary>
        <DeepLinkHandler />
        <ScrollToTop />
        <BadgeSeenOnRoute />
        <Routes>
          <Route element={<AppLayout />}>
            {/* Suspense fallback lives in AppLayout so loaders ride the page slide */}
            <Route path="/" element={<Index />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/support" element={<Support />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/locations" element={<ManageLocations />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/help" element={<Help />} />
            <Route path="/feature-guides" element={<FeatureGuides />} />
            <Route path="/guides/:id" element={<GuideDetail />} />
            <Route path="/charging-history" element={<ChargingHistory />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            {/* Under AppLayout so exit→home rides AnimatedOutlet (chrome hidden in AppLayout). */}
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            {TurbineTest && <Route path="/__turbine-test" element={<TurbineTest />} />}
            {SceneTestPage && <Route path="/__scene-test" element={<SceneTestPage />} />}
            {DesignSystemPage && <Route path="/__design-system" element={<DesignSystemPage />} />}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <CookieConsent />
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <HelmetProvider>
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24, buster: QUERY_CACHE_BUSTER }}
  >
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <TooltipProvider>
        <ErrorBoundary>
          <LocationProvider>
            <SceneDirectorProvider>
              <AchievementManager />
              <DirectorPanel />
              <AppContent />
            </SceneDirectorProvider>
          </LocationProvider>
        </ErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  </PersistQueryClientProvider>
  </HelmetProvider>
);

export default App;
