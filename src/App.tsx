import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useCapacitor } from "@/hooks/useCapacitor";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Planner from "./pages/Planner";
import MapPage from "./pages/Map";
import ScrollToTop from "@/components/ScrollToTop";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  // Initialize Capacitor for native platforms
  useCapacitor();

  return (
    <>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/map" element={<MapPage />} />
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
