import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Ensure Vite doesn't bundle multiple copies of React
    dedupe: ["react", "react-dom", "react-router", "react-router-dom", "@tanstack/react-query"],
    preserveSymlinks: false,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
    // Force re-optimizing dependencies (helps when Vite cache gets corrupted)
    force: true,
  },
}));
