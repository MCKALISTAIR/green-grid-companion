import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      manifest: {
        name: 'GridSense Companion',
        short_name: 'GridSense',
        description: 'Track UK Grid Carbon Intensity',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    // Keep aliases minimal; rely on `dedupe` to avoid multiple React instances.
    // Aliasing React to an absolute file path can itself create duplicate module
    // identities (e.g. `react` vs `/.../react/index.js`) and trigger invalid hooks.
    alias: {
      "@": path.resolve(__dirname, "./src"),
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
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**/*', 'src/vite-env.d.ts', 'src/**/*.test.{ts,tsx}'],
    },
  },
}));
