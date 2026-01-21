import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

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

      // Hard-pin React to a single resolved path.
      // This prevents multiple React copies from being loaded (which causes
      // `useEffect`/`useContext` to crash with "Cannot read properties of null").
      react: require.resolve("react"),
      "react-dom": require.resolve("react-dom"),
      "react-dom/client": require.resolve("react-dom/client"),
      "react/jsx-runtime": require.resolve("react/jsx-runtime"),
      "react/jsx-dev-runtime": require.resolve("react/jsx-dev-runtime"),
      scheduler: require.resolve("scheduler"),
    },
    // Ensure Vite doesn't bundle multiple copies of React
    // Include React subpath entries too (some deps import these directly)
    dedupe: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "scheduler",
      "react-router",
      "react-router-dom",
      "@tanstack/react-query",
    ],
    preserveSymlinks: false,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "scheduler",
      "react-router-dom",
      "@tanstack/react-query",
    ],
    // Force re-optimizing dependencies (helps when Vite cache gets corrupted)
    force: true,
  },
}));
