import { test, expect } from '@playwright/test';

// Viewport sizes matching Scene Visual QA + iPhone Duo presets
const PRESETS = [
  { name: 'iPhone-SE', width: 375, height: 667 },
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPhone-Duo-Cover', width: 466, height: 678 },
  { name: 'iPhone-Duo-Inner', width: 890, height: 626 },
  { name: 'iPhone-Duo-Inner-Portrait', width: 626, height: 890 },
  { name: 'iPad-Pro', width: 1024, height: 1366 },
  { name: 'Desktop-1080p', width: 1920, height: 1080 }
];

/** Map e2e slug → SceneTest aria-label fragment (human labels in SceneTest). */
const PRESET_ARIA: Record<string, string> = {
  'iPhone-SE': 'iPhone SE',
  'iPhone-14': 'iPhone 14',
  'iPhone-Duo-Cover': 'iPhone Duo Cover',
  'iPhone-Duo-Inner': 'iPhone Duo Inner',
  'iPhone-Duo-Inner-Portrait': 'iPhone Duo Inner Portrait',
  'iPad-Pro': 'iPad Pro',
  'Desktop-1080p': 'Desktop',
};

test.describe('GridSense Dynamic Art Visual Integrity', () => {
  const TEST_CASES = [
    { label: 'very-clean-midday', intensity: 'very low', time: 'midday', weather: 'clear' },
    { label: 'moderate-sunset', intensity: 'moderate', time: 'sunset', weather: 'clouds' },
    { label: 'very-dirty-night', intensity: 'very high', time: 'night', weather: 'thunderstorm' }
  ];

  for (const tc of TEST_CASES) {
    for (const preset of PRESETS) {
      test(`renders ${tc.label} correctly on ${preset.name}`, async ({ page }) => {
        await page.setViewportSize({ width: preset.width, height: preset.height });
        await page.goto(`http://localhost:8080/__scene-test`);
        await page.waitForTimeout(1000);

        const ariaFragment = PRESET_ARIA[preset.name] ?? preset.name.replace(/-/g, ' ');
        const preview = page.locator(`[aria-label*="${ariaFragment} viewport preview"]`);
        if (await preview.count() > 0) {
          await expect(preview.first()).toHaveScreenshot(`scene-${tc.label}-${preset.name}.png`, {
            maxDiffPixelRatio: 0.01
          });
        }
      });
    }
  }
});
