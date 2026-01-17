import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useCapacitor } from "@/hooks/useCapacitor";
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { registerServiceWorker } from "@/hooks/useOffline";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Planner from "./pages/Planner";
import MapPage from "./pages/Map";
import Settings from "./pages/Settings";
import ScrollToTop from "@/components/ScrollToTop";
import NotFound from "./pages/NotFound";

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
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/onboarding" element={<Onboarding />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
