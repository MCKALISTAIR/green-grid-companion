import { defineConfig } from '@playwright/test';
const width = Number(process.env.PHONE_WIDTH || 390);
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 90000,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${process.env.PORT || 4291}`,
    viewport: { width, height: Number(process.env.PHONE_HEIGHT || 844) },
    deviceScaleFactor: 3,
    hasTouch: true,
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
    timezoneId: 'Europe/London',
    browserName: 'chromium',
    name: `${width}x${process.env.PHONE_HEIGHT || 844}`,
  },
  webServer: {
    command: `npm run preview -- --port ${process.env.PORT || 4291} --strictPort`,
    url: `http://localhost:${process.env.PORT || 4291}`,
    reuseExistingServer: false,
  },
});
