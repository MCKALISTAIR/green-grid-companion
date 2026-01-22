import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useCapacitor } from "@/hooks/useCapacitor";
import { useEffect, Suspense, lazy } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { registerServiceWorker } from "@/hooks/useOffline";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";

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
const NotFound = lazy(() => import("./pages/NotFound"));
const TurbineTest = lazy(() => import("./pages/TurbineTest"));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache data for 30 minutes for offline use
      gcTime: 30 * 60 * 1000,
      // Retry failed requests
      retry: 2,
      // Don't refetch on window focus when offline
      refetchOnWindowFocus: true,
    },
  },
});

function AppContent() {
  // Initialize Capacitor for native platforms
  useCapacitor();

  // Register service worker for offline support
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Listen for App Resume (coming from background)
  useEffect(() => {
    const handleAppStateChange = async (state: { isActive: boolean }) => {
      if (state.isActive) {
        console.log("App resumed. Refreshing data...");
        // Invalidate all queries to force a refresh if data is stale
        await queryClient.invalidateQueries();
      }
    };

    const subscription = CapacitorApp.addListener('appStateChange', handleAppStateChange);

    return () => {
      subscription.then(handle => handle.remove());
    };
  }, []);

  return (
    <>
      <OfflineIndicator />
      <Sonner position="top-center" />
      <BrowserRouter>
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
            <Route path="/__turbine-test" element={<Suspense fallback={<PageLoader />}><TurbineTest /></Suspense>} />
            <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
          </Route>
          <Route path="/onboarding" element={<Suspense fallback={<PageLoader />}><Onboarding /></Suspense>} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <TooltipProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
