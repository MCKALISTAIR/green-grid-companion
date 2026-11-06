import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 90_000,
  fullyParallel: false,
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:8141',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite --port 8141 --strictPort',
    url: 'http://localhost:8141',
    reuseExistingServer: false,
    timeout: 90_000,
    fullyParallel: false,
    reporter: 'line',
    env: { CHOKIDAR_USEPOLLING: '1' },
  },
});
