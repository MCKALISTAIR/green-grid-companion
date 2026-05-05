import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useCapacitor } from "@/hooks/useCapacitor";
import { useEffect, Suspense, lazy, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { registerServiceWorker } from "@/hooks/useOffline";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useSmartPrefetch } from "@/hooks/useSmartPrefetch";
import ScrollToTop from "@/components/ScrollToTop";
import { logger } from "@/lib/logger";
import { AchievementManager } from "@/components/AchievementManager";
import { DirectorPanel } from "@/components/DirectorPanel";
import { StatusBarManager } from "@/components/StatusBarManager";
import { ComponentErrorBoundary } from "@/components/ComponentErrorBoundary";
import { SplashScreen } from "@/components/SplashScreen";
import { DeepLinkHandler } from "@/components/DeepLinkHandler";
import { CookieConsent } from "@/components/CookieConsent";
import { LocationProvider } from "@/contexts/LocationContext";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Planner = lazy(() => import("./pages/Planner"));
const MapPage = lazy(() => import("./pages/Map"));
const Settings = lazy(() => import("./pages/Settings"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Glossary = lazy(() => import("./pages/Glossary"));
const HistoryPage = lazy(() => import("./pages/History"));
const ManageLocations = lazy(() => import("./pages/ManageLocations"));
const Changelog = lazy(() => import("./pages/Changelog"));
const Help = lazy(() => import("./pages/Help"));
const FeatureGuides = lazy(() => import("./pages/FeatureGuides"));
const GuideDetail = lazy(() => import("./pages/GuideDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TurbineTest = lazy(() => import("./pages/TurbineTest"));
const SceneTestPage = lazy(() => import("./pages/SceneTest"));
const DesignSystemPage = lazy(() => import("./pages/DesignSystem"));
const ChargingHistory = lazy(() => import("./pages/ChargingHistory"));
const AchievementsPage = lazy(() => import('./pages/Achievements'));
import AuthCallback from "./pages/AuthCallback";

// Loading fallback with wind turbine spinner
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 40 40"
        className="w-10 h-10 text-primary"
        aria-label="Loading"
      >
        {/* Tower */}
        <path
          d="M19 20 L18 38 L22 38 L21 20 Z"
          fill="currentColor"
          opacity="0.6"
        />
        {/* Hub */}
        <circle cx="20" cy="18" r="2.5" fill="currentColor" />
        {/* Blades - rotating group */}
        <g className="origin-center animate-spin" style={{ transformOrigin: "20px 18px" }}>
          <path d="M20 18 L19 4 Q20 2 21 4 L20 18 Z" fill="currentColor" />
          <path d="M20 18 L8 26 Q7 24 9 23 L20 18 Z" fill="currentColor" />
          <path d="M20 18 L32 26 Q33 24 31 23 L20 18 Z" fill="currentColor" />
        </g>
      </svg>
      <span className="text-xs text-muted-foreground">Loading...</span>
    </div>
  </div>
);

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
  const [showSplash, setShowSplash] = useState(true);

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
        // Force refetch of critical carbon data queries regardless of stale time
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['national'], type: 'active' }),
          queryClient.refetchQueries({ queryKey: ['regional'], type: 'active' }),
          queryClient.refetchQueries({ queryKey: ['forecast'], type: 'active' }),
          queryClient.refetchQueries({ queryKey: ['generationMix'], type: 'active' }),
        ]);
      }
    };

    const subscription = CapacitorApp.addListener('appStateChange', handleAppStateChange);

    return () => {
      subscription.then(handle => handle.remove());
    };
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <OfflineIndicator />
      <Sonner position="top-center" />
      <BrowserRouter>
        <DeepLinkHandler />
        <ScrollToTop />
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Suspense fallback={<PageLoader />}><Index /></Suspense>} />
            <Route path="/planner" element={<Suspense fallback={<PageLoader />}><Planner /></Suspense>} />
            <Route path="/map" element={<Suspense fallback={<PageLoader />}><MapPage /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
            <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>} />
            <Route path="/glossary" element={<Suspense fallback={<PageLoader />}><Glossary /></Suspense>} />
            <Route path="/history" element={<Suspense fallback={<PageLoader />}><HistoryPage /></Suspense>} />
            <Route path="/locations" element={<Suspense fallback={<PageLoader />}><ManageLocations /></Suspense>} />
            <Route path="/changelog" element={<Suspense fallback={<PageLoader />}><Changelog /></Suspense>} />
            <Route path="/help" element={<Suspense fallback={<PageLoader />}><Help /></Suspense>} />
            <Route path="/feature-guides" element={<Suspense fallback={<PageLoader />}><FeatureGuides /></Suspense>} />
            <Route path="/guides/:id" element={<Suspense fallback={<PageLoader />}><GuideDetail /></Suspense>} />
            <Route path="/charging-history" element={<Suspense fallback={<PageLoader />}><ChargingHistory /></Suspense>} />
            <Route path="/achievements" element={<Suspense fallback={<PageLoader />}><AchievementsPage /></Suspense>} />
            <Route path="/__turbine-test" element={<Suspense fallback={<PageLoader />}><TurbineTest /></Suspense>} />
            <Route path="/__scene-test" element={<Suspense fallback={<PageLoader />}><SceneTestPage /></Suspense>} />
            <Route path="/__design-system" element={<Suspense fallback={<PageLoader />}><DesignSystemPage /></Suspense>} />
            <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
          </Route>
          <Route path="/onboarding" element={<Suspense fallback={<PageLoader />}><Onboarding /></Suspense>} />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
        <CookieConsent />
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <TooltipProvider>
        <ErrorBoundary>
          <LocationProvider>
            <AchievementManager />
            <DirectorPanel />
            <ComponentErrorBoundary name="Status Bar Manager">
              <StatusBarManager />
            </ComponentErrorBoundary>
            <AppContent />
          </LocationProvider>
        </ErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  </PersistQueryClientProvider>
);

export default App;
