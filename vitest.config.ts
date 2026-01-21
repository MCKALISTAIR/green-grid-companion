import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { pathToFileURL } from "url";

const root = process.cwd();

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Convert path to file URL string for Windows compatibility
    setupFiles: [path.resolve(root, "./src/test/setup.ts")],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(root, "./src") },
  },
});
