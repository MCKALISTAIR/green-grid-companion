import { defineConfig } from '@playwright/test';
import { DUO_VIEWPORTS } from './e2e/support/duoViewports';

const width = Number(process.env.PHONE_WIDTH || 390);
const duo = DUO_VIEWPORTS.find((v) => v.id === 'duo-outer-portrait')!;
const useDuo = width === duo.width;
const height = useDuo ? duo.height : Number(process.env.PHONE_HEIGHT || 844);
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 90000,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${process.env.PORT || 4291}`,
    viewport: { width, height },
    deviceScaleFactor: useDuo ? duo.dpr : 3,
    hasTouch: true,
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
    timezoneId: 'Europe/London',
    browserName: 'chromium',
    name: `${width}x${height}`,
  },
  webServer: {
    command: `npm run preview -- --port ${process.env.PORT || 4291} --strictPort`,
    url: `http://localhost:${process.env.PORT || 4291}`,
    reuseExistingServer: false,
  },
});
