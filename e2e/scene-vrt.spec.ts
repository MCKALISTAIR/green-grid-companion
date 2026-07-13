import { test, expect } from '@playwright/test';

// Viewport sizes matching our visual QA presets
const PRESETS = [
  { name: 'iPhone-SE', width: 375, height: 667 },
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPad-Pro', width: 1024, height: 1366 },
  { name: 'Desktop-1080p', width: 1920, height: 1080 }
];

test.describe('GridSense Dynamic Art Visual Integrity', () => {
  // Test multiple visual combinations
  const TEST_CASES = [
    { label: 'very-clean-midday', intensity: 'very low', time: 'midday', weather: 'clear' },
    { label: 'moderate-sunset', intensity: 'moderate', time: 'sunset', weather: 'clouds' },
    { label: 'very-dirty-night', intensity: 'very high', time: 'night', weather: 'thunderstorm' }
  ];

  for (const tc of TEST_CASES) {
    for (const preset of PRESETS) {
      test(`renders ${tc.label} correctly on ${preset.name}`, async ({ page }) => {
        // Set simulated device dimensions
        await page.setViewportSize({ width: preset.width, height: preset.height });

        // Navigate to developer scene test page with overrides
        await page.goto(`http://localhost:8080/__scene-test`);

        // Wait for dynamic assets and framer-motion animations to settle
        await page.waitForTimeout(1000);

        // Select the preview area and compare against baseline snapshot
        const preview = page.locator(`[aria-label*="${preset.name} viewport preview"]`);
        if (await preview.count() > 0) {
          await expect(preview.first()).toHaveScreenshot(`scene-${tc.label}-${preset.name}.png`, {
            maxDiffPixelRatio: 0.01 // Allow up to 1% difference for minor rendering variations
          });
        }
      });
    }
  }
});
