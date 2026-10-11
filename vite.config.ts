import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fallback env values (publishable keys only) in case .env isn't provisioned (dev only)
  const fallbackEnv: Record<string, string> = {};
  if (!process.env.VITE_SUPABASE_URL) {
    fallbackEnv['import.meta.env.VITE_SUPABASE_URL'] = JSON.stringify('https://klwezcjmlrdwvvzisdtd.supabase.co');
  }
  if (!process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    fallbackEnv['import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY'] = JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsd2V6Y2ptbHJkd3Z2emlzZHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MjU0MzcsImV4cCI6MjA4NDEwMTQzN30.InAQiMMh0AyhjOiK5sg3CHeJzyzKCCXme2yh40G8AMs');
  }
  if (!process.env.VITE_SUPABASE_PROJECT_ID) {
    fallbackEnv['import.meta.env.VITE_SUPABASE_PROJECT_ID'] = JSON.stringify('klwezcjmlrdwvvzisdtd');
  }
  fallbackEnv['import.meta.env.PACKAGE_VERSION'] = JSON.stringify(process.env.npm_package_version || '1.6.0');

  return ({
  define: fallbackEnv,
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            if (id.includes('recharts')) {
              return 'recharts';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('lucide-react')) {
              return 'lucide-react';
            }
            if (id.includes('@sentry')) {
              return 'sentry';
            }
            if (id.includes('@tanstack')) {
              return 'tanstack';
            }
            if (id.includes('date-fns')) {
              return 'date-fns';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      '^/~oauth': {
        target: 'https://gridsense-app.lovable.app',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "production" && VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Share-card image is for crawlers only; don't precache it on devices.
        globIgnores: ['**/og-image.png'],
        navigateFallbackDenylist: [/^\/~oauth/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Carbon Intensity API - network first, fall back to cache
            urlPattern: /^https:\/\/api\.carbonintensity\.org\.uk\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'carbon-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Supabase edge functions - network first
            urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'edge-functions-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 4, // 4 hours
              },
              networkTimeoutSeconds: 15,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      // Single web manifest: public/manifest.json (linked from index.html).
      // The plugin used to generate a second, conflicting manifest.webmanifest
      // ("GridSense Companion", theme #ffffff); keep it off so there is one source.
      manifest: false,
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
});
});
