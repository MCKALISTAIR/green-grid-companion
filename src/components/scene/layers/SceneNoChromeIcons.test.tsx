import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { render } from '@testing-library/react';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import type { WeatherData } from '@/hooks/useWeatherData';
import { SceneGenerationOverlay } from './SceneGenerationOverlay';
import { SceneMilestoneFX } from './SceneMilestoneFX';

// BH-102 (Design): no UI-chrome icons or warning chrome painted into the scene.
// The Lucide leaf/flame/droplet overlays and the in-scene PollutionWarning
// (⚠ triangle, pulsing red border, red vignette, blurred particles) are gone,
// with nothing in their place.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function config(cleanliness: number): SceneVisualConfig {
  return {
    cleanliness,
    isDaytime: true,
    showSun: true,
    showRenewables: cleanliness > 0.4,
    showFactories: cleanliness < 0.5,
    showSmoke: cleanliness < 0.5,
    groundColor: '#4a7c3f',
    windSpeed: 10,
    weatherKnown: true,
    hazeBand: cleanliness < 0.2 ? 'very high' : 'none',
  } as SceneVisualConfig;
}

function renderOverlay(cleanliness: number, isCity = false, isCoastal = false) {
  return render(
    <SceneGenerationOverlay
      sceneConfig={config(cleanliness)}
      isCity={isCity}
      isCoastal={isCoastal}
      isNight={false}
      turbineLayout={[]}
      turbineOverdrive={null}
      handleTurbineClick={() => {}}
      nuclearPercentage={0}
      windPercentage={0}
      hydroPercentage={0}
      marinePercentage={0}
      windSpeed={10}
    />,
  );
}

const weather = { isRaining: false } as WeatherData;

describe('BH-102 no chrome icons in the scene', () => {
  it.each([0.05, 0.15, 0.5, 0.7, 0.8, 0.95])(
    'SceneGenerationOverlay draws no Lucide icons at cleanliness %s',
    (cleanliness) => {
      for (const [isCity, isCoastal] of [
        [false, false],
        [true, false],
        [false, true],
      ]) {
        const { container, unmount } = renderOverlay(cleanliness, isCity, isCoastal);
        expect(container.querySelectorAll('svg.lucide')).toHaveLength(0);
        expect(container.querySelector('.animate-leaf-float')).toBeNull();
        expect(container.querySelector('.text-destructive')).toBeNull();
        unmount();
      }
    },
  );

  it('PR-2b: the overlay no longer paints white-box factories or loose smoke', () => {
    // The one gas plant (and its smoke) lives in the countryside back-hill layer.
    const { container } = renderOverlay(0.1);
    expect(container.querySelector('[data-art="smoke"]')).toBeNull();
    expect(container.querySelector('[data-art="gas-plant"]')).toBeNull();
  });

  it.each([301, 340, 450])('no pollution warning, red border or vignette at %s g', (intensity) => {
    const { container } = render(
      <SceneMilestoneFX
        intensity={intensity}
        weather={weather}
        sceneConfig={config(0.05)}
        hasLiveReading
      />,
    );
    expect(container.querySelector('[class*="border-red"]')).toBeNull();
    expect(container.querySelector('[class*="red-900"]')).toBeNull();
    expect(container.querySelector('.blur-sm')).toBeNull();
    expect(container.querySelector('path[fill="#ef4444"]')).toBeNull();
    expect(container.innerHTML).toBe('');
  });

  it('source: no Lucide import in the scene overlay and PollutionWarning is deleted', () => {
    const overlay = fs.readFileSync(path.join(__dirname, 'SceneGenerationOverlay.tsx'), 'utf-8');
    expect(overlay).not.toMatch(/from 'lucide-react'/);
    const fx = fs.readFileSync(path.join(__dirname, 'SceneMilestoneFX.tsx'), 'utf-8');
    expect(fx).not.toContain('PollutionWarning');
    expect(fs.existsSync(path.join(__dirname, '../PollutionWarning.tsx'))).toBe(false);
  });
});
