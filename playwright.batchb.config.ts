import { defineConfig } from '@playwright/test';
import { DUO_VIEWPORTS } from './e2e/support/duoViewports';

const width = Number(process.env.PHONE_WIDTH || 390);
const duo = DUO_VIEWPORTS.find((v) => v.id === 'duo-outer-portrait')!;
const useDuo = width === duo.width;
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${process.env.PORT || 4191}`,
    viewport: useDuo
      ? { width, height: duo.height }
      : { width, height: Number(process.env.PHONE_HEIGHT || 844) },
    deviceScaleFactor: useDuo ? duo.dpr : 3,
    hasTouch: true,
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
    timezoneId: 'Europe/London',
    browserName: 'chromium',
  },
  webServer: {
    command: `npm run preview -- --port ${process.env.PORT || 4191} --strictPort`,
    url: `http://localhost:${process.env.PORT || 4191}`,
    reuseExistingServer: false,
  },
});
