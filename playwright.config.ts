import { defineConfig, devices } from '@playwright/test';
import { DUO_VIEWPORTS } from './e2e/support/duoViewports';

/**
 * Playwright configuration for GridSense e2e and Visual Regression Tests.
 *
 * Tests live in the `e2e/` directory.
 *
 * Run all e2e tests:
 *   npx playwright test
 *
 * Generate/update baseline screenshots:
 *   npx playwright test e2e/scene-vrt.spec.ts --update-snapshots
 *
 * Requires the dev server running on port 8080. The `webServer` block below
 * starts it automatically if it is not already running.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  snapshotDir: './e2e/__snapshots__',

  /* Run tests in parallel across files */
  fullyParallel: true,

  /* Fail CI build if you accidentally left test.only in source */
  forbidOnly: !!process.env.CI,

  /* No retries locally; 2 retries on CI */
  retries: process.env.CI ? 2 : 0,

  /* One worker on CI for stability; uncapped locally */
  workers: process.env.CI ? 1 : undefined,

  /* Reporters */
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    /* Base URL so tests can use page.goto('/') instead of full URL */
    baseURL: 'http://localhost:8080',

    /* Capture screenshots on failures */
    screenshot: 'only-on-failure',

    /* Collect traces on first retry for debugging */
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /duo-.*\.spec\.ts/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /duo-.*\.spec\.ts/,
    },
    /* iPhone Duo (cover and inner screens). Only the duo-*.spec.ts files run here;
       sizes live in e2e/support/duoViewports.ts. Run: npx playwright test --project='duo-*' */
    ...DUO_VIEWPORTS.map((v) => ({
      name: v.id,
      testMatch: /duo-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: v.width, height: v.height },
        deviceScaleFactor: v.dpr,
        hasTouch: true,
        serviceWorkers: 'block' as const,
      },
    })),
  ],

  /* Start dev server automatically if not already running */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
